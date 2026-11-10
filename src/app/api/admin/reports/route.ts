import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { userFromRequest } from "@/lib/server-auth";
import { SETTINGS_DIR, waNumber } from "@/lib/whatsapp";
import { isPlainEmail } from "@/lib/email";

// Admin → Daily report: who gets the morning report (email + WhatsApp, with PDF), on/off, send now.
// Settings go to SETTINGS_DIR/report.json, read by deploy/daily-report.mjs (runs every day at 8 AM).
const FILE = path.join(SETTINGS_DIR, "report.json");
const LAST = path.join(SETTINGS_DIR, "report-last.json");

type Settings = { token?: string; emails?: string[]; whatsapp?: string[]; enabled?: boolean };

async function admin(request: Request) {
  const auth = await userFromRequest(request);
  if (!auth) return null;
  const { data } = await auth.supabase.rpc("is_admin");
  return data === true ? auth : null;
}
const read = async <T,>(f: string, d: T): Promise<T> => { try { return JSON.parse(await fs.readFile(f, "utf8")) as T; } catch { return d; } };

async function status() {
  const s = await read<Settings>(FILE, {});
  return {
    on: !!s.token && s.enabled !== false,
    emails: s.emails ?? [],
    whatsapp: s.whatsapp ?? [],
    defaultEmail: process.env.ADMIN_EMAIL || process.env.SMTP_USER || "",
    emailReady: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    last: await read<Record<string, unknown> | null>(LAST, null),
  };
}

export async function GET(request: Request) {
  if (!(await admin(request))) return Response.json({ error: "Admins only" }, { status: 403 });
  return Response.json(await status());
}

export async function POST(request: Request) {
  const auth = await admin(request);
  if (!auth) return Response.json({ error: "Admins only" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === "save") {
    const emails = String(body.emails ?? "").split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    const bad = emails.find((e) => !isPlainEmail(e));
    if (bad) return Response.json({ error: `“${bad}” is not a valid email address.` }, { status: 400 });
    const nums = String(body.whatsapp ?? "").split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
    const whatsapp: string[] = [];
    for (const n of nums) {
      const w = waNumber(n);
      if (!w) return Response.json({ error: `“${n}” is not a 10-digit Indian mobile number.` }, { status: 400 });
      whatsapp.push(w);
    }
    if (emails.length > 5 || whatsapp.length > 5) return Response.json({ error: "Up to 5 email addresses and 5 WhatsApp numbers." }, { status: 400 });
    const { data: token, error } = await auth.supabase.rpc("admin_report_token");
    if (error || !token) return Response.json({ error: `Could not read the report code: ${error?.message ?? "missing"}. Database update 025 is needed.` }, { status: 500 });
    try {
      await fs.mkdir(SETTINGS_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(FILE, JSON.stringify({ token, emails, whatsapp, enabled: body.enabled !== false }), { mode: 0o600 });
    } catch (e) {
      return Response.json({ error: `Could not save on the server (${e instanceof Error ? e.message : "error"}).` }, { status: 500 });
    }
    return Response.json({ ok: true, ...(await status()) });
  }

  if (body.action === "send") {
    const s = await read<Settings>(FILE, {});
    if (!s.token) return Response.json({ error: "Press Save first." }, { status: 400 });
    // Runs the same script as the 8 AM report, in the background (it takes 1–3 minutes).
    const child = spawn(process.execPath, [path.join(process.cwd(), "deploy", "daily-report.mjs"), "--now"], {
      cwd: process.cwd(), env: { ...process.env, APP_DIR: process.cwd(), SETTINGS_DIR }, detached: true, stdio: "ignore",
    });
    child.unref();
    return Response.json({ ok: true, text: "Building the report – it arrives in 1–3 minutes. The result appears below." });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
