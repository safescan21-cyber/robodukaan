import { revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured, sendBackInStockEmail } from "@/lib/email";

// Refreshes cached catalog pages so changes show at once.
// - Admins: after any catalog change in the admin panel.
// - Signed-in customers: after saving a review (so the review count and stars update),
//   at most once a minute per customer.
const lastReviewRefresh = new Map<string, number>();

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (!error && isAdmin === true) {
    revalidateTag("catalog", { expire: 0 });
    const notified = await sendStockAlerts(supabase).catch(() => 0);
    return Response.json({ ok: true, notified });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.reason !== "review") return Response.json({ error: "Admins only" }, { status: 403 });
  const { data: userData } = await supabase.auth.getUser(token);
  const userId = userData.user?.id;
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
  const now = Date.now();
  if (now - (lastReviewRefresh.get(userId) ?? 0) < 60_000) return Response.json({ ok: true, skipped: true });
  lastReviewRefresh.set(userId, now);
  if (lastReviewRefresh.size > 5000) lastReviewRefresh.clear();
  revalidateTag("catalog", { expire: 0 });
  return Response.json({ ok: true });
}

// After an admin catalog change (e.g. stock updated): email everyone waiting for a product that is
// back in stock, once. Runs with the admin's own login, so it only sees what admins may see.
async function sendStockAlerts(supabase: SupabaseClient) {
  if (!emailConfigured()) return 0;
  const { data, error } = await supabase
    .from("stock_alerts")
    .select("id, email, product:products(name, slug, price, stock, is_active)")
    .is("notified_at", null)
    .limit(200);
  if (error || !data) return 0; // e.g. before migration 014
  type Row = { id: string; email: string; product: { name: string; slug: string; price: number; stock: number; is_active: boolean } | null };
  const ready = (data as unknown as Row[]).filter((r) => r.product && r.product.is_active && r.product.stock > 0);
  const sent: string[] = [];
  for (const r of ready) {
    if (await sendBackInStockEmail(r.email, { name: r.product!.name, slug: r.product!.slug, price: Number(r.product!.price) })) sent.push(r.id);
  }
  if (sent.length) await supabase.from("stock_alerts").update({ notified_at: new Date().toISOString() }).in("id", sent);
  return sent.length;
}
