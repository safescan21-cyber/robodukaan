import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

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
    return Response.json({ ok: true });
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
