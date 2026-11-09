import { promises as fs } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Admin → Site health: latest results of the server monitor (deploy/monitor.py, every 5 minutes). Admins only.
const STATUS = "/var/lib/robodukaan-monitor/status.json";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Admins only" }, { status: 403 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return Response.json({ error: "Admins only" }, { status: 403 });
  try {
    return Response.json(JSON.parse(await fs.readFile(STATUS, "utf8")));
  } catch {
    return Response.json({ checked_at: null, results: [] });
  }
}
