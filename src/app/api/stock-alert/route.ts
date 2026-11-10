import { createClient } from "@supabase/supabase-js";
import { clientIp } from "@/lib/client-ip";

// "Notify me when back in stock" (guests allowed). Checks and spam limits are in request_stock_alert().
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 20) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.slice(0, 40) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
  if (!productId || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return Response.json({ error: "Please enter a valid email" }, { status: 400 });
  // Only well-formed requests count towards the limit.
  if (!allowed(clientIp(request.headers))) return Response.json({ error: "Too many requests – please try again later." }, { status: 429 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("request_stock_alert", { p_product: productId, p_email: email });
  if (error) {
    const known = /valid email|Too many|not found/.test(error.message);
    return Response.json({ error: known ? error.message : "Could not save your request. Please try again." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
