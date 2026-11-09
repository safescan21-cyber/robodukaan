import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured, sendOrderEmails } from "@/lib/email";
import { sendOrderWhatsApp, waConfig } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

// Right after checkout: the "order received" email + WhatsApp to the customer and a new-order alert to the admin.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  const email = emailConfigured();
  const wa = await waConfig();
  // Until a mailbox or WhatsApp is connected, skip without marking anything as sent.
  if (!email && !wa) return Response.json({ ok: true, sent: false, reason: "email and WhatsApp not configured" });
  const { orderNumber } = await request.json().catch(() => ({}));
  if (typeof orderNumber !== "string") return Response.json({ error: "orderNumber required" }, { status: 400 });

  const { data: order } = await auth.supabase
    .from("orders").select("*, order_items(*)").eq("order_number", orderNumber).maybeSingle();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  // Only the first call sends (stops repeated messages if the page is reloaded).
  const { data: claimed } = await auth.supabase.rpc("claim_order_email", { p_order_id: order.id });
  if (!claimed) return Response.json({ ok: true, sent: false });

  const [sent, whatsapp] = await Promise.all([
    email ? sendOrderEmails(order as Order) : Promise.resolve(false),
    wa ? sendOrderWhatsApp(order as Order, wa) : Promise.resolve(null),
  ]);
  return Response.json({ ok: true, sent, whatsapp: whatsapp?.ok ?? null });
}
