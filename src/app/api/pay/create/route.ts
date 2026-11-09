import { userFromRequest } from "@/lib/server-auth";
import { createRzpOrder, hmacHex, rzpEnabled } from "@/lib/razorpay";

// Start an online payment for one of the customer's own orders: create the Razorpay order for the exact
// total and link it to our order (signed, so it can't be swapped for a cheaper one).
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Please log in" }, { status: 401 });
  const cfg = await rzpEnabled();
  if (!cfg) return Response.json({ error: "Online payment is not available right now. Please choose cash on delivery." }, { status: 400 });
  const { orderNumber } = await request.json().catch(() => ({}));
  if (typeof orderNumber !== "string" || orderNumber.length > 40) return Response.json({ error: "orderNumber required" }, { status: 400 });

  const { data: o } = await auth.supabase.from("orders")
    .select("id, order_number, total, status, payment_status, razorpay_order_id, customer_name, phone, email")
    .eq("order_number", orderNumber).maybeSingle();
  if (!o) return Response.json({ error: "Order not found" }, { status: 404 });
  if (o.status === "cancelled") return Response.json({ error: "This order is cancelled." }, { status: 400 });
  if (o.payment_status === "paid") return Response.json({ error: "This order is already paid.", paid: true, orderId: o.id }, { status: 400 });

  const amount = Math.round(Number(o.total) * 100);
  let rzpOrderId = o.razorpay_order_id as string | null;
  if (!rzpOrderId) {
    try {
      rzpOrderId = await createRzpOrder(cfg.keyId, cfg.keySecret, amount, o.order_number, { order_number: o.order_number, order_id: o.id });
    } catch (e) {
      console.error("[pay] create failed:", e instanceof Error ? e.message : e);
      return Response.json({ error: "Could not start the payment. Please try again or choose cash on delivery." }, { status: 502 });
    }
    const sig = hmacHex(cfg.keySecret, `${o.id}|${rzpOrderId}|${amount}`);
    const { error } = await auth.supabase.rpc("attach_payment", { p_order_id: o.id, p_razorpay_order_id: rzpOrderId, p_amount: amount, p_sig: sig });
    if (error) {
      console.error("[pay] attach failed:", error.message);
      return Response.json({ error: /set up/.test(error.message) ? "Online payment is not fully set up yet (Admin → Payments)." : error.message }, { status: 400 });
    }
  }
  return Response.json({
    keyId: cfg.keyId, razorpayOrderId: rzpOrderId, amount, currency: "INR", orderId: o.id, orderNumber: o.order_number,
    prefill: { name: o.customer_name, contact: `+91${o.phone}`, email: o.email ?? undefined },
  });
}
