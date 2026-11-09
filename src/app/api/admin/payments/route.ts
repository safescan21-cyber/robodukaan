import { userFromRequest } from "@/lib/server-auth";
import { rzpSettings, saveRzpSettings, testRzpKeys } from "@/lib/razorpay";

// Admin → Payments: save Razorpay keys (server file + database copy of the secret), test them. Admins only.
async function admin(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return null;
  const { data } = await auth.supabase.rpc("is_admin");
  return data === true ? auth : null;
}

async function status(auth: NonNullable<Awaited<ReturnType<typeof admin>>>) {
  const s = await rzpSettings();
  const { data: dbSecret } = await auth.supabase.rpc("admin_secret_is_set", { p_name: "razorpay_key_secret" });
  return {
    enabled: !!(s.keyId && s.keySecret),
    keyId: s.keyId,
    mode: s.keyId.startsWith("rzp_live_") ? "live" : s.keyId.startsWith("rzp_test_") ? "test" : "",
    secretEnd: s.keySecret ? s.keySecret.slice(-4) : "",
    webhook: !!s.webhookSecret,
    dbReady: dbSecret === true,
    fromEnv: s.fromEnv,
  };
}

export async function GET(request: Request) {
  const auth = await admin(request);
  if (!auth) return Response.json({ error: "Admins only" }, { status: 403 });
  return Response.json(await status(auth));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s/g, "").slice(0, max) : "");

export async function POST(request: Request) {
  const auth = await admin(request);
  if (!auth) return Response.json({ error: "Admins only" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const cur = await rzpSettings();

  if (body.action === "save") {
    const keyId = str(body.keyId, 60);
    const keySecret = str(body.keySecret, 100) || cur.keySecret;
    const webhookSecret = str(body.webhookSecret, 100) || cur.webhookSecret;
    if (!/^rzp_(live|test)_[A-Za-z0-9]{8,30}$/.test(keyId)) return Response.json({ error: "Key ID starts with rzp_live_ or rzp_test_ (Razorpay → Account & Settings → API Keys)." }, { status: 400 });
    if (keySecret.length < 10) return Response.json({ error: "Paste the Key Secret shown when you generated the key." }, { status: 400 });
    const test = await testRzpKeys(keyId, keySecret);
    if (!test.ok) return Response.json({ error: `Razorpay did not accept these keys: ${test.error}` }, { status: 400 });
    const { error } = await auth.supabase.rpc("admin_set_secret", { p_name: "razorpay_key_secret", p_value: keySecret });
    if (error) return Response.json({ error: `Could not save in the database: ${error.message}` }, { status: 500 });
    try {
      await saveRzpSettings({ keyId, keySecret, webhookSecret });
    } catch (e) {
      return Response.json({ error: `Could not save on the server (${e instanceof Error ? e.message : "error"}). Try again in 5 minutes.` }, { status: 500 });
    }
    return Response.json({ ok: true, ...(await status(auth)) });
  }

  if (body.action === "off") {
    await saveRzpSettings(null).catch(() => {});
    await auth.supabase.rpc("admin_set_secret", { p_name: "razorpay_key_secret", p_value: "" });
    return Response.json({ ok: true, ...(await status(auth)) });
  }

  if (body.action === "test") {
    if (!cur.keyId || !cur.keySecret) return Response.json({ error: "Save the keys first." }, { status: 400 });
    const r = await testRzpKeys(cur.keyId, cur.keySecret);
    return r.ok ? Response.json({ ok: true, text: "Razorpay accepted the keys ✓" }) : Response.json({ error: r.error }, { status: 400 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
