import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured, sendInvoiceEmail } from "@/lib/email";
import { sendInvoiceWhatsApp } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

// Admin confirms an order (or presses "Send invoice"): issue the invoice number if it has none yet,
// then email + WhatsApp the customer the invoice with all product details. Admins only.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { data: isAdmin } = await auth.supabase.rpc("is_admin");
  if (isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });

  const { orderId } = await request.json().catch(() => ({}));
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return Response.json({ error: "orderId required" }, { status: 400 });

  const load = () => auth.supabase.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
  let { data: order } = await load();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "cancelled") return Response.json({ error: "Cancelled orders don't get an invoice." }, { status: 400 });

  if (!order.invoice_number) {
    const { error } = await auth.supabase.rpc("issue_invoice", { p_order_id: orderId });
    if (error) return Response.json({ error: `Could not issue the invoice number: ${error.message}` }, { status: 500 });
    ({ data: order } = await load());
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  }

  // The invoice is the "confirmed" message: mark this event as told so it isn't sent twice.
  await auth.supabase.rpc("claim_order_update", { p_order_id: orderId });

  const [emailed, whatsapp] = await Promise.all([
    order.email && emailConfigured() ? sendInvoiceEmail(order as Order) : Promise.resolve(false),
    sendInvoiceWhatsApp(order as Order),
  ]);
  return Response.json({
    ok: true,
    invoiceNumber: order.invoice_number,
    email: order.email ? (emailConfigured() ? (emailed ? "sent" : "failed") : "email not set up on the server") : "customer gave no email",
    whatsapp: whatsapp === null ? "not connected (Admin → WhatsApp)" : whatsapp.ok ? "sent" : `failed: ${whatsapp.error}`,
  });
}
