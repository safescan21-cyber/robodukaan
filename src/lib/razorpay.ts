import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import { SETTINGS_DIR } from "./whatsapp";

// Online payment with Razorpay (UPI, cards, net banking, wallets).
// Admin → Payments saves the keys into SETTINGS_DIR/razorpay.json (never in GitHub, never sent to the browser
// except the public Key ID). RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET env vars override.
// The database keeps its own copy of the key secret to check payment signatures (migration 024).
const FILE = `${SETTINGS_DIR}/razorpay.json`;
const API = () => process.env.RAZORPAY_API_BASE || "https://api.razorpay.com";

type Saved = { keyId?: string; keySecret?: string; webhookSecret?: string };

async function readSaved(): Promise<Saved> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Saved;
  } catch {
    return {};
  }
}

export async function rzpSettings() {
  const s = await readSaved();
  return {
    keyId: process.env.RAZORPAY_KEY_ID || s.keyId || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || s.keySecret || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || s.webhookSecret || "",
    fromEnv: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}

export async function rzpEnabled() {
  const s = await rzpSettings();
  return s.keyId && s.keySecret ? s : null;
}

export async function saveRzpSettings(next: Saved | null) {
  await fs.mkdir(SETTINGS_DIR, { recursive: true, mode: 0o700 });
  if (!next) return fs.rm(FILE, { force: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

export const hmacHex = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");

export function sameHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

function auth(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

// Razorpay order for the exact order total (in paise). https://razorpay.com/docs/api/orders/create/
export async function createRzpOrder(keyId: string, keySecret: string, amountPaise: number, receipt: string, notes: Record<string, string>) {
  const res = await fetch(`${API()}/v1/orders`, {
    method: "POST",
    headers: { Authorization: auth(keyId, keySecret), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!res.ok || !data.id) throw new Error(data.error?.description || `Razorpay error ${res.status}`);
  return data.id;
}

// Admin "Test connection": a harmless read with the keys.
export async function testRzpKeys(keyId: string, keySecret: string) {
  try {
    const res = await fetch(`${API()}/v1/orders?count=1`, { headers: { Authorization: auth(keyId, keySecret) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (res.ok) return { ok: true as const };
    const data = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
    return { ok: false as const, error: data.error?.description || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "network error" };
  }
}
