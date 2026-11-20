import { createClient } from "@supabase/supabase-js";
import { clientIp } from "@/lib/client-ip";
import { sendCourseEnquiryEmail } from "@/lib/email";

// PCB repair course enquiry form (guests allowed). Saved for Admin → Repair course, emailed to the admin.
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 5) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Bad request" }, { status: 400 });
  const input = { name: str(body.name, 100), phone: str(body.phone, 20), email: str(body.email, 200), city: str(body.city, 80), level: str(body.level, 40), message: str(body.message, 1000) };
  const mobile = input.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (input.name.length < 2) return Response.json({ error: "Please enter your name" }, { status: 400 });
  if (!/^[6-9]\d{9}$/.test(mobile)) return Response.json({ error: "Please enter a valid 10-digit mobile number" }, { status: 400 });
  if (!allowed(clientIp(request.headers))) return Response.json({ error: "Too many requests – please call or email us instead." }, { status: 429 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("course_enquiry", { p: { ...input, phone: mobile } });
  if (error) {
    const known = /Please|already|valid/.test(error.message);
    return Response.json({ error: known ? error.message : "Could not send your enquiry. Please try again." }, { status: 400 });
  }
  sendCourseEnquiryEmail({ ...input, phone: mobile }).catch(() => {});
  return Response.json({ ok: true });
}
