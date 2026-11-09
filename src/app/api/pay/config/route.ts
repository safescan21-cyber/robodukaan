import { rzpEnabled } from "@/lib/razorpay";

// Checkout asks whether online payment is switched on (and gets the public Key ID).
export async function GET() {
  const s = await rzpEnabled();
  return Response.json({ enabled: !!s, keyId: s?.keyId ?? null }, { headers: { "Cache-Control": "no-store" } });
}
