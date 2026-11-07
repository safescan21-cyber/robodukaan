import { createClient } from "@supabase/supabase-js";
import { submitWholeSite } from "@/lib/indexnow";

// Admin → Dashboard → "Submit all pages to search engines": sends every sitemap page (all languages)
// to IndexNow (Bing, Yandex, …). Admins only, at most once every 10 minutes.
let lastRun = 0;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });
  if (Date.now() - lastRun < 10 * 60 * 1000) return Response.json({ error: "Already sent in the last 10 minutes – no need to repeat." }, { status: 429 });
  lastRun = Date.now();
  const sent = await submitWholeSite();
  if (!sent) { lastRun = 0; return Response.json({ error: "Search engines could not be reached. Please try again later." }, { status: 502 }); }
  return Response.json({ ok: true, sent });
}
