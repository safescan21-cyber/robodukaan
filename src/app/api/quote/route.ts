import { createClient } from "@supabase/supabase-js";
import { userFromRequest } from "@/lib/server-auth";
import { sendQuoteRequestEmails } from "@/lib/email";
import { clientIp } from "@/lib/client-ip";
import type { QuoteRequest } from "@/lib/types";

// Bulk quote requests from product pages and /bulk-quote. Guests allowed.
// Checks and spam limits live in the database function request_quote(); this adds a per-visitor limit
// and sends the emails.
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 8) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  if (!allowed(clientIp(request.headers))) {
    return Response.json({ error: "Too many requests – please call or email us instead." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Bad request" }, { status: 400 });

  const input = {
    product_id: str(body.product_id, 40),
    product_name: str(body.product_name, 200),
    quantity: Number(body.quantity),
    name: str(body.name, 100),
    company: str(body.company, 120),
    gstin: str(body.gstin, 20),
    phone: str(body.phone, 20),
    email: str(body.email, 200),
    city: str(body.city, 80),
    message: str(body.message, 2000),
  };

  // Signed-in customers are linked to their request (they can see it later); guests use the public key.
  const auth = await userFromRequest(request);
  const supabase = auth?.supabase
    ?? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("request_quote", { p: input });
  if (error) {
    const known = /Please|Too many|too long|valid/.test(error.message);
    return Response.json({ error: known ? error.message : "Could not send your request. Please try again." }, { status: 400 });
  }

  const q: QuoteRequest = {
    id: data.id, quote_number: data.quote_number, user_id: auth?.user.id ?? null, product_id: input.product_id || null,
    product_name: input.product_name || null, quantity: input.quantity, name: input.name, company: input.company || null,
    gstin: input.gstin ? input.gstin.replace(/\s/g, "").toUpperCase() : null, phone: input.phone.replace(/\D/g, "").slice(-10),
    email: input.email || auth?.user.email || null, city: input.city || null, message: input.message || null,
    status: "new", quoted_amount: null, admin_notes: null, created_at: new Date().toISOString(),
  };
  await sendQuoteRequestEmails(q).catch(() => false);
  return Response.json({ ok: true, quote_number: data.quote_number });
}
