import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured } from "@/lib/email";
import { sendOrderEmails } from "@/lib/email";
import type { Order } from "@/lib/types";

// Sends the "order received" email to the customer and a new-order alert to the admin.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  // Until a mailbox is connected, skip without marking anything as sent.
  if (!emailConfigured()) return Response.json({ ok: true, sent: false, reason: "email not configured" });
  const { orderNumber } = await request.json().catch(() => ({}));
  if (typeof orderNumber !== "string") return Response.json({ error: "orderNumber required" }, { status: 400 });

  const { data: order } = await auth.supabase
    .from("orders").select("*, order_items(*)").eq("order_number", orderNumber).maybeSingle();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  // Only the first call sends (stops repeated emails if the page is reloaded).
  const { data: claimed } = await auth.supabase.rpc("claim_order_email", { p_order_id: order.id });
  if (!claimed) return Response.json({ ok: true, sent: false });

  const sent = await sendOrderEmails(order as Order);
  return Response.json({ ok: true, sent });
}
