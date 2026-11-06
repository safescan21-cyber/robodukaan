import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Called by the admin panel after a catalog change so the shop updates at once.
// Only signed-in admins may trigger it.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });

  revalidateTag("catalog", { expire: 0 });
  return Response.json({ ok: true });
}
