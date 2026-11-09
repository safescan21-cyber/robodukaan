import "server-only";
import { promises as fs } from "node:fs";
import { formatINR, formatINR2 } from "./format";
import type { Order, OrderItem } from "./types";

// Automatic WhatsApp messages through Meta's official WhatsApp Business (Cloud) API.
// Admin → WhatsApp saves the settings into SETTINGS_DIR/whatsapp.json on the server (never in GitHub,
// never sent back to the browser). WHATSAPP_TOKEN / WHATSAPP_PHONE_ID environment variables override it.
// Messages to customers who haven't written to us in 24 h must use a template approved by Meta.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
export const SETTINGS_DIR = process.env.SETTINGS_DIR || "/var/lib/robodukaan-settings";
const FILE = `${SETTINGS_DIR}/whatsapp.json`;
const LOG = `${SETTINGS_DIR}/whatsapp-log.json`;

export type WaConfig = { token: string; phoneId: string; template: string; invoiceTemplate: string; updateTemplate: string; lang: string; apiVersion: string; fromEnv: boolean };
type Saved = Partial<Pick<WaConfig, "token" | "phoneId" | "template" | "invoiceTemplate" | "updateTemplate" | "lang">>;

export const DEFAULT_TEMPLATE = "order_confirmation";
export const DEFAULT_INVOICE_TEMPLATE = "order_invoice";
export const DEFAULT_UPDATE_TEMPLATE = "order_update";

async function readSaved(): Promise<Saved> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Saved;
  } catch {
    return {};
  }
}

export async function waSettings() {
  const saved = await readSaved();
  const token = process.env.WHATSAPP_TOKEN || saved.token || "";
  const phoneId = process.env.WHATSAPP_PHONE_ID || saved.phoneId || "";
  return {
    token,
    phoneId,
    template: process.env.WHATSAPP_ORDER_TEMPLATE || saved.template || DEFAULT_TEMPLATE,
    invoiceTemplate: process.env.WHATSAPP_INVOICE_TEMPLATE || saved.invoiceTemplate || DEFAULT_INVOICE_TEMPLATE,
    updateTemplate: process.env.WHATSAPP_UPDATE_TEMPLATE || saved.updateTemplate || DEFAULT_UPDATE_TEMPLATE,
    lang: saved.lang || "en",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v24.0",
    fromEnv: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
  };
}

export async function waConfig(): Promise<WaConfig | null> {
  const s = await waSettings();
  return s.token && s.phoneId ? s : null;
}

export async function saveWaSettings(next: Saved | null) {
  await fs.mkdir(SETTINGS_DIR, { recursive: true, mode: 0o700 });
  if (!next) {
    await fs.rm(FILE, { force: true });
    return;
  }
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

// Indian mobile numbers as typed by customers ("98765 43210", "+91-98765…", "098765…") → "919876543210".
export function waNumber(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`;
  if (d.length === 12 && /^91[6-9]/.test(d)) return d;
  return null;
}

// Template values may not contain line breaks, tabs or more than 4 spaces in a row (Meta rule).
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 1000) || "-";

export type WaResult = { ok: boolean; id?: string; error?: string };

export async function sendWaTemplate(cfg: WaConfig, to: string, template: string, lang: string, params: string[] = []): Promise<WaResult> {
  try {
    const res = await fetch(`${process.env.WHATSAPP_API_BASE || "https://graph.facebook.com"}/${cfg.apiVersion}/${encodeURIComponent(cfg.phoneId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          ...(params.length ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: clean(text) })) }] } : {}),
        },
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; error_user_msg?: string; code?: number } };
    if (res.ok && data.messages?.[0]?.id) return { ok: true, id: data.messages[0].id };
    const e = data.error;
    return { ok: false, error: (e?.error_user_msg || e?.message || `HTTP ${res.status}`) + (e?.code ? ` (code ${e.code})` : "") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

// Values for the order template, in order: {{1}} name, {{2}} order number, {{3}} total, {{4}} order link.
export function orderTemplateParams(order: Pick<Order, "id" | "customer_name" | "order_number" | "total">) {
  return [order.customer_name.split(" ")[0] || order.customer_name, order.order_number, formatINR(order.total), `${SITE}/account/orders/${order.id}`];
}

export async function logResult(entry: Record<string, unknown>) {
  try {
    const old = JSON.parse(await fs.readFile(LOG, "utf8").catch(() => "[]")) as unknown[];
    await fs.writeFile(LOG, JSON.stringify([{ at: new Date().toISOString(), ...entry }, ...old].slice(0, 30)), { mode: 0o600 });
  } catch {
    /* logging is best effort */
  }
}

export async function waRecentLog(): Promise<{ at: string; order?: string; to?: string; ok: boolean; error?: string }[]> {
  try {
    return JSON.parse(await fs.readFile(LOG, "utf8"));
  } catch {
    return [];
  }
}

// "Order received" WhatsApp to the customer. Returns null when WhatsApp isn't set up.
export async function sendOrderWhatsApp(order: Order, cfg?: WaConfig | null): Promise<WaResult | null> {
  cfg ??= await waConfig();
  if (!cfg) return null;
  const to = waNumber(order.phone);
  const masked = to ? `…${to.slice(-4)}` : order.phone;
  if (!to) {
    await logResult({ order: order.order_number, to: masked, ok: false, error: "not a valid Indian mobile number" });
    return { ok: false, error: "not a valid Indian mobile number" };
  }
  const r = await sendWaTemplate(cfg, to, cfg.template, cfg.lang, orderTemplateParams(order));
  if (!r.ok) console.error(`[whatsapp] order ${order.order_number}: ${r.error}`);
  await logResult({ order: order.order_number, to: masked, ok: r.ok, error: r.error });
  return r;
}

// Products for the invoice template on one line (template values can't contain line breaks):
// "2 × Mean Well EDR-120-24 (MW-EDR-120-24) ₹4,300; 1 × SSR-40DA (SSR-40DA) ₹320" – shortened if very long.
export function productsLine(items: Pick<OrderItem, "name" | "sku" | "quantity" | "line_total">[], max = 600) {
  const parts = items.map((i) => `${i.quantity} × ${i.name} (${i.sku}) ${formatINR2(i.line_total)}`);
  let out = "";
  for (let n = 0; n < parts.length; n++) {
    const next = out ? `${out}; ${parts[n]}` : parts[n];
    if (next.length > max) return `${out}; +${parts.length - n} more item${parts.length - n > 1 ? "s" : ""}`;
    out = next;
  }
  return out;
}

// Values for the invoice template, in order: {{1}} name, {{2}} order number, {{3}} invoice number,
// {{4}} products, {{5}} total incl. GST, {{6}} invoice link.
export function invoiceTemplateParams(order: Pick<Order, "id" | "customer_name" | "order_number" | "invoice_number" | "total"> & { order_items?: Pick<OrderItem, "name" | "sku" | "quantity" | "line_total">[] }) {
  return [
    order.customer_name.split(" ")[0] || order.customer_name,
    order.order_number,
    order.invoice_number || "-",
    productsLine(order.order_items ?? []),
    formatINR2(order.total),
    `${SITE}/account/orders/${order.id}/invoice`,
  ];
}

// "Order confirmed + invoice" WhatsApp to the customer. Returns null when WhatsApp isn't set up.
export async function sendInvoiceWhatsApp(order: Order, cfg?: WaConfig | null): Promise<WaResult | null> {
  cfg ??= await waConfig();
  if (!cfg) return null;
  const to = waNumber(order.phone);
  const label = `${order.order_number} invoice`;
  if (!to) {
    await logResult({ order: label, to: order.phone, ok: false, error: "not a valid Indian mobile number" });
    return { ok: false, error: "not a valid Indian mobile number" };
  }
  const r = await sendWaTemplate(cfg, to, cfg.invoiceTemplate, cfg.lang, invoiceTemplateParams(order));
  if (!r.ok) console.error(`[whatsapp] invoice ${order.order_number}: ${r.error}`);
  await logResult({ order: label, to: `…${to.slice(-4)}`, ok: r.ok, error: r.error });
  return r;
}
