import { userFromRequest } from "@/lib/server-auth";
import { emailConfigured } from "@/lib/email";
import { sendWelcomeEmail } from "@/lib/email";

// Sends the welcome email once, after the customer's email is confirmed.
export async function POST(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return Response.json({ error: "Not signed in" }, { status: 401 });
  // Until a mailbox is connected, skip without marking anything as sent.
  if (!emailConfigured()) return Response.json({ ok: true, sent: false, reason: "email not configured" });
  if (!auth.user.email || !auth.user.email_confirmed_at) return Response.json({ ok: true, sent: false });

  const { data: claimed } = await auth.supabase.rpc("claim_welcome_email");
  if (!claimed) return Response.json({ ok: true, sent: false });

  const { data: profile } = await auth.supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle();
  const sent = await sendWelcomeEmail(auth.user.email, profile?.full_name ?? null);
  return Response.json({ ok: true, sent });
}
