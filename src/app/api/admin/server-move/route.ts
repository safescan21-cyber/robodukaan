import { promises as dns } from "node:dns";
import { promises as fs } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Admin panel → "Server move": start the automatic database move (deploy/vps-db/auto-move.sh) from a
// phone browser, without the terminal. The form is saved for the server's root updater (deploy/auto-update.sh,
// every 5 minutes), which starts the move and deletes the file. Admins only.
const DIR = process.env.MOVE_DIR || "/var/lib/robodukaan-move";
const API_HOST = "api.pcbdukaan.com";

async function isAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

async function serverIp() {
  try {
    const res = await fetch("https://api.ipify.org", { signal: AbortSignal.timeout(8000), cache: "no-store" });
    return res.ok ? (await res.text()).trim() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: "Admins only" }, { status: 403 });
  const [ip, apiIps, status, pending, ready] = await Promise.all([
    serverIp(),
    dns.resolve4(API_HOST).catch(() => [] as string[]),
    fs.readFile(`${DIR}/status.log`, "utf8").catch(() => ""),
    fs.access(`${DIR}/request.json`).then(() => true, () => false),
    fs.access(DIR).then(() => true, () => false),
  ]);
  return Response.json({
    serverIp: ip,
    apiHost: API_HOST,
    apiIps,
    dnsReady: !!ip && apiIps.includes(ip),
    serverReady: ready,
    pending,
    status: status.split("\n").slice(-40).join("\n"),
  });
}

// Passwords with @ # / ? etc. must be URL-encoded inside the connection string.
function encodePassword(url: string) {
  const m = url.match(/^(postgres(?:ql)?:\/\/)([^:@/]+):(.*)@([^@]+)$/);
  if (!m) return url;
  let pass = m[3];
  try { pass = decodeURIComponent(pass); } catch { /* keep as typed */ }
  return `${m[1]}${m[2]}:${encodeURIComponent(pass)}@${m[4]}`;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s/g, "").slice(0, max) : "");

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: "Admins only" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    await fs.access(DIR);
  } catch {
    return Response.json({ error: "The server isn't ready for this yet – wait 5–10 minutes (it updates itself) and try again." }, { status: 503 });
  }
  if (body.action === "retry") {
    await fs.writeFile(`${DIR}/request.json`, JSON.stringify({ action: "retry" }), { mode: 0o600 });
    return Response.json({ ok: true });
  }
  if (body.action === "cancel") {
    await fs.writeFile(`${DIR}/request.json`, JSON.stringify({ action: "cancel" }), { mode: 0o600 });
    return Response.json({ ok: true });
  }
  const cloudUrl = encodePassword(clean(body.cloud_url, 500));
  const s3Key = clean(body.s3_key, 200);
  const s3Secret = clean(body.s3_secret, 300);
  if (!/^postgres(ql)?:\/\/[^@\s]+@[^\s:]+:\d+\/\S+$/.test(cloudUrl) || cloudUrl.includes("[YOUR-PASSWORD]")) {
    return Response.json({ error: "The connection string doesn't look right. Copy it from Supabase → Connect → Session pooler and put your database password in place of [YOUR-PASSWORD]." }, { status: 400 });
  }
  if (/@db\.[a-z0-9]+\.supabase\.co[:/]/.test(cloudUrl)) {
    return Response.json({ error: "This is the “Direct connection” string – most servers can't reach it. In Supabase → Connect choose “Session pooler” and copy that one (it contains pooler.supabase.com)." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9]{8,}$/.test(s3Key) || !/^[A-Za-z0-9+/=_-]{16,}$/.test(s3Secret)) {
    return Response.json({ error: "Please paste the Storage S3 Access key ID and Secret access key." }, { status: 400 });
  }
  const region = clean(body.s3_region, 40);
  await fs.writeFile(`${DIR}/request.json`, JSON.stringify({
    action: "start", cloud_url: cloudUrl, s3_key: s3Key, s3_secret: s3Secret,
    s3_region: /^[a-z0-9-]*$/.test(region) ? region : "", night: body.night !== false,
  }), { mode: 0o600 });
  return Response.json({ ok: true });
}
