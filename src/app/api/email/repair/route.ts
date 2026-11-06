import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured } from "@/lib/email";
import { sendRepairReceivedEmails, sendRepairUpdateEmail } from "@/lib/email";
import type { RepairRequest } from "@/lib/types";

// kind "received": customer just submitted (customer + admin emails, sent once).
// kind "update":   an admin changed the status/quote and wants the customer told.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  // Until a mailbox is connected, skip without marking anything as sent.
  if (!emailConfigured()) return Response.json({ ok: true, sent: false, reason: "email not configured" });
  const { requestId, kind } = await request.json().catch(() => ({}));
  if (typeof requestId !== "string" || (kind !== "received" && kind !== "update")) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const { data: repair } = await auth.supabase.from("repair_requests").select("*").eq("id", requestId).maybeSingle();
  if (!repair) return Response.json({ error: "Request not found" }, { status: 404 });

  if (kind === "received") {
    const { data: claimed } = await auth.supabase.rpc("claim_repair_email", { p_request_id: requestId });
    if (!claimed) return Response.json({ ok: true, sent: false });
    return Response.json({ ok: true, sent: await sendRepairReceivedEmails(repair as RepairRequest) });
  }

  const { data: isAdmin } = await auth.supabase.rpc("is_admin");
  if (isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });
  return Response.json({ ok: true, sent: await sendRepairUpdateEmail(repair as RepairRequest) });
}
