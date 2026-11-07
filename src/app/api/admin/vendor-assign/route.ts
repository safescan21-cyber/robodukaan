import { createClient } from "@supabase/supabase-js";
import { sendVendorAssignmentEmail } from "@/lib/email";
import type { Vendor, VendorOrderView } from "@/lib/types";

// Admin assigns an order to a vendor (or re-assigns it): saves the assignment with a fresh private link and
// emails the vendor the order. Returns the link for the WhatsApp button. Admins only.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const orderId = String(body?.order_id ?? "");
  const vendorId = String(body?.vendor_id ?? "");
  const resend = body?.resend === true;
  const adminNote = typeof body?.admin_note === "string" ? body.admin_note.trim().slice(0, 1000) || null : null;
  if (!UUID.test(orderId) || (!resend && !UUID.test(vendorId))) return Response.json({ error: "Bad request" }, { status: 400 });

  const { data: current, error: readErr } = await supabase.from("vendor_assignments").select("*").eq("order_id", orderId).maybeSingle();
  if (readErr) {
    return Response.json({ error: /vendor_assignments/.test(readErr.message) ? "Run database update 017 (supabase/migrations/RUN-IN-SUPABASE.sql) first." : readErr.message }, { status: 500 });
  }
  let link: string;
  let assignedVendorId: string;
  if (resend) {
    if (!current) return Response.json({ error: "This order isn't assigned yet." }, { status: 400 });
    link = `${SITE}/vendor/${current.token}`;
    assignedVendorId = current.vendor_id;
  } else {
    if (current?.status === "dispatched") return Response.json({ error: "This order was already dispatched by the vendor." }, { status: 400 });
    const fresh = crypto.randomUUID();
    const values = {
      vendor_id: vendorId, token: fresh, status: "assigned", admin_note: adminNote, assigned_at: new Date().toISOString(),
      accepted_at: null, dispatched_at: null, courier: null, tracking_number: null, tracking_url: null, vendor_note: null, notified_at: null,
    };
    const { error } = current
      ? await supabase.from("vendor_assignments").update(values).eq("id", current.id)
      : await supabase.from("vendor_assignments").insert({ ...values, order_id: orderId });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    link = `${SITE}/vendor/${fresh}`;
    assignedVendorId = vendorId;
  }

  const [{ data: vendor }, { data: view }] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", assignedVendorId).single(),
    supabase.rpc("vendor_order", { p_token: link.split("/").pop() }),
  ]);
  let emailed = false;
  if (vendor && view) {
    emailed = await sendVendorAssignmentEmail(vendor as Vendor, view as VendorOrderView, link).catch(() => false);
    if (emailed) await supabase.from("vendor_assignments").update({ notified_at: new Date().toISOString() }).eq("order_id", orderId);
  }
  return Response.json({ ok: true, link, emailed, vendorEmail: (vendor as Vendor | null)?.email ?? null });
}
