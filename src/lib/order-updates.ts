import "server-only";
import { sendOrderUpdateEmail } from "./email";
import { orderEvent } from "./order-events";
import { logResult, sendWaTemplate, waConfig, waNumber } from "./whatsapp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "./types";

// Tell the customer about the latest order event by email + WhatsApp – exactly once per event.
// claim_order_update (migration 022) decides whether there is anything new and returns the order details.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

type Claimed = {
  previous: string;
  order: { id: string; order_number: string; customer_name: string; phone: string; email: string | null; status: OrderStatus; payment_status: string; tracking_url: string | null; total: number };
  items: { name: string; sku: string; quantity: number; line_total: number }[];
  courier: string | null;
  tracking_number: string | null;
};

export type UpdateResult = { event: string | null; email?: string; whatsapp?: string };

export async function notifyOrderUpdate(supabase: SupabaseClient, orderId: string, vendorToken?: string): Promise<UpdateResult> {
  const { data, error } = await supabase.rpc("claim_order_update", { p_order_id: orderId, ...(vendorToken ? { p_vendor_token: vendorToken } : {}) });
  if (error) {
    console.error("[order-update] claim failed:", error.message);
    return { event: null };
  }
  if (!data) return { event: null };
  const c = data as Claimed;
  const ev = orderEvent(c.previous, c.order, SITE, c.courier, c.tracking_number);
  if (!ev) return { event: null };
  const o = c.order;

  const cfg = await waConfig();
  const to = waNumber(o.phone);
  const [emailed, wa] = await Promise.all([
    sendOrderUpdateEmail(o.email, o, ev, c.items, { courier: c.courier, tracking_number: c.tracking_number }).catch(() => false),
    cfg && to
      ? sendWaTemplate(cfg, to, cfg.updateTemplate, cfg.lang, [o.customer_name.split(" ")[0] || o.customer_name, o.order_number, ev.text, ev.link])
      : Promise.resolve(null),
  ]);
  if (cfg) await logResult({ order: `${o.order_number} ${ev.kind}`, to: to ? `…${to.slice(-4)}` : o.phone, ok: !!wa?.ok, error: to ? wa?.error : "not a valid Indian mobile number" });
  return {
    event: ev.kind,
    email: o.email ? (emailed ? "sent" : "not sent") : "no email",
    whatsapp: !cfg ? "not connected" : !to ? "invalid number" : wa?.ok ? "sent" : `failed: ${wa?.error}`,
  };
}
