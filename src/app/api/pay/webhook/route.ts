import { createClient } from "@supabase/supabase-js";
import { hmacHex, rzpEnabled, sameHex } from "@/lib/razorpay";

// Razorpay → https://pcbdukaan.com/api/pay/webhook (events: payment.captured, order.paid).
// Marks the order paid even if the customer closed the browser before the checkout could report back.
export async function POST(request: Request) {
  const cfg = await rzpEnabled();
  if (!cfg?.webhookSecret) return Response.json({ error: "Webhook not set up" }, { status: 503 });
  const raw = await request.text();
  const sig = request.headers.get("x-razorpay-signature") ?? "";
  if (!sameHex(hmacHex(cfg.webhookSecret, raw), sig)) return Response.json({ error: "Bad signature" }, { status: 401 });

  const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
  const p = event.payload?.payment?.entity;
  if (!["payment.captured", "order.paid"].includes(event.event ?? "") || !p?.id || !p.order_id) return Response.json({ ok: true, ignored: true });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("confirm_payment", {
    p_razorpay_order_id: p.order_id, p_payment_id: p.id, p_signature: hmacHex(cfg.keySecret, `${p.order_id}|${p.id}`),
  });
  // Payments for orders made elsewhere (not from this shop) are acknowledged so Razorpay stops retrying.
  if (error) console.warn(`[pay] webhook ${p.order_id}: ${error.message}`);
  return Response.json({ ok: true });
}
