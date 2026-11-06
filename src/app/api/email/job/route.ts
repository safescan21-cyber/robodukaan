import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured, sendJobApplicationEmails } from "@/lib/email";
import type { JobApplication } from "@/lib/types";

// Confirmation to the applicant and an alert to the admin, sent once per application.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!emailConfigured()) return Response.json({ ok: true, sent: false, reason: "email not configured" });
  const { applicationId } = await request.json().catch(() => ({}));
  if (typeof applicationId !== "string") return Response.json({ error: "applicationId required" }, { status: 400 });

  const { data: app } = await auth.supabase.from("job_applications").select("*, job:jobs(title, slug)").eq("id", applicationId).maybeSingle();
  if (!app) return Response.json({ error: "Application not found" }, { status: 404 });
  const { data: claimed } = await auth.supabase.rpc("claim_job_application_email", { p_application_id: applicationId });
  if (!claimed) return Response.json({ ok: true, sent: false });

  const sent = await sendJobApplicationEmails(app as JobApplication, (app as JobApplication).job ?? { title: "a job", slug: "" });
  return Response.json({ ok: true, sent });
}
