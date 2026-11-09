import { userFromRequest } from "@/lib/server-auth";
import { notifyOrderUpdate } from "@/lib/order-updates";

// Called after an order changes (admin update, customer cancels): sends the customer the new event.
// Safe to call any time – the database only lets the owner or an admin claim it, and each event goes out once.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { orderId } = await request.json().catch(() => ({}));
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return Response.json({ error: "orderId required" }, { status: 400 });
  return Response.json({ ok: true, ...(await notifyOrderUpdate(auth.supabase, orderId)) });
}
