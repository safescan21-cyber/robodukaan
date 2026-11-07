import { createClient } from "@supabase/supabase-js";
import { sendOrderShippedEmail, sendVendorUpdateToAdmin } from "@/lib/email";
import { clientIp } from "@/lib/client-ip";
import type { VendorOrderView } from "@/lib/types";

// The vendor's buttons on their private link (/vendor/<token>): accept, decline, dispatched.
// The database checks the link and the order; this sends the notifications.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 20) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!UUID.test(token)) return Response.json({ error: "This link is not valid" }, { status: 404 });
  if (!allowed(clientIp(request.headers))) return Response.json({ error: "Too many requests – please wait a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const action = str(body?.action, 20);
  if (!["accept", "decline", "dispatch"].includes(action)) return Response.json({ error: "Bad request" }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("vendor_order_update", {
    p_token: token, p_action: action,
    p_courier: str(body?.courier, 80) || null, p_tracking: str(body?.tracking_number, 80) || null,
    p_tracking_url: str(body?.tracking_url, 500) || null, p_note: str(body?.note, 1000) || null,
  });
  if (error) {
    const known = /Please|already|valid|cancelled|must start/.test(error.message);
    return Response.json({ error: known ? error.message : "Could not save – please try again." }, { status: 400 });
  }
  const view = data as VendorOrderView;
  const { data: meta } = await supabase.rpc("vendor_order_meta", { p_token: token });
  const m = (meta ?? {}) as { order_id?: string; customer_email?: string | null };
  await Promise.all([
    sendVendorUpdateToAdmin(view, m.order_id ?? null).catch(() => false),
    action === "dispatch" ? sendOrderShippedEmail(m.customer_email, view).catch(() => false) : Promise.resolve(false),
  ]);
  return Response.json({ ok: true, order: view });
}
