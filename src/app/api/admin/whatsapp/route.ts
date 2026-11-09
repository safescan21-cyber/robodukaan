import { userFromRequest } from "@/lib/server-auth";
import { DEFAULT_TEMPLATE, orderTemplateParams, saveWaSettings, sendWaTemplate, waNumber, waRecentLog, waSettings } from "@/lib/whatsapp";

// Admin → WhatsApp: connect the WhatsApp Business API, send test messages, see recent results. Admins only.
// The access token is stored on the server only; the browser just sees its last 4 characters.
async function admin(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return false;
  const { data, error } = await auth.supabase.rpc("is_admin");
  return !error && data === true;
}

async function status() {
  const s = await waSettings();
  return {
    connected: !!(s.token && s.phoneId),
    phoneId: s.phoneId,
    tokenEnd: s.token ? s.token.slice(-4) : "",
    template: s.template,
    lang: s.lang,
    fromEnv: s.fromEnv,
    log: (await waRecentLog()).slice(0, 15),
  };
}

export async function GET(request: Request) {
  if (!(await admin(request))) return Response.json({ error: "Admins only" }, { status: 403 });
  return Response.json(await status());
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  if (!(await admin(request))) return Response.json({ error: "Admins only" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const current = await waSettings();

  if (body.action === "save") {
    const phoneId = str(body.phoneId, 40).replace(/\s/g, "");
    const token = str(body.token, 1000).replace(/\s/g, "") || current.token;
    const template = str(body.template, 100) || DEFAULT_TEMPLATE;
    const lang = str(body.lang, 10) || "en";
    if (!/^\d{6,30}$/.test(phoneId)) return Response.json({ error: "Phone number ID is the long number shown in Meta → WhatsApp → API Setup (digits only) – not your mobile number." }, { status: 400 });
    if (!token || token.length < 20) return Response.json({ error: "Paste the access token from Meta (it is long, usually starts with EAA)." }, { status: 400 });
    if (!/^[a-z0-9_]+$/.test(template)) return Response.json({ error: "Template name: small letters, numbers and _ only, exactly as in WhatsApp Manager." }, { status: 400 });
    if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(lang)) return Response.json({ error: "Language code like en, en_US or hi." }, { status: 400 });
    try {
      await saveWaSettings({ phoneId, token, template, lang });
    } catch (e) {
      return Response.json({ error: `Could not save on the server (${e instanceof Error ? e.message : "error"}). Wait 5 minutes after the latest update and try again.` }, { status: 500 });
    }
    return Response.json({ ok: true, ...(await status()) });
  }

  if (body.action === "remove") {
    await saveWaSettings(null).catch(() => {});
    return Response.json({ ok: true, ...(await status()) });
  }

  if (body.action === "test") {
    if (!current.token || !current.phoneId) return Response.json({ error: "Save the settings first." }, { status: 400 });
    const to = waNumber(str(body.to, 20));
    if (!to) return Response.json({ error: "Enter a 10-digit Indian mobile number." }, { status: 400 });
    const r = body.kind === "order"
      ? await sendWaTemplate(current, to, current.template, current.lang, orderTemplateParams({ id: "test", customer_name: "Test Customer", order_number: "PD-TEST-001", total: 1234 }))
      : await sendWaTemplate(current, to, "hello_world", "en_US");
    return Response.json(r.ok ? { ok: true, text: `Sent to +${to}. Check WhatsApp on that phone.` } : { error: r.error }, { status: r.ok ? 200 : 400 });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
