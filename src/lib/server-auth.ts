import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// For API routes: a Supabase client that acts as the signed-in user, so every
// query is limited by Row Level Security exactly as in the browser.
export async function userFromRequest(request: Request): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}
