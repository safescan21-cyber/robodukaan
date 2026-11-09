import { createClient } from "@supabase/supabase-js";
import { userFromRequest } from "@/lib/server-auth";

// After the Razorpay window says "paid": the database checks Razorpay's signature and marks the order paid.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as Record<string, unknown>;
  if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v.length < 200)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const supabase = (await userFromRequest(request))?.supabase
    ?? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("confirm_payment", {
    p_razorpay_order_id: razorpay_order_id, p_payment_id: razorpay_payment_id, p_signature: razorpay_signature,
  });
  if (error) return Response.json({ error: "We could not confirm the payment yet. If money was taken, it will show as paid within a few minutes." }, { status: 400 });
  return Response.json({ ok: true, ...(data as object) });
}
