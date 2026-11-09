"use client";

import { getSupabase } from "./supabase-browser";

// Opens Razorpay's payment window (UPI, cards, net banking, wallets) for one of the customer's orders.
// Resolves "paid" once our database has checked Razorpay's signature, "closed" if the customer closes it.
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: unknown) => void) => void };
declare global { interface Window { Razorpay?: RazorpayCtor } }

let script: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { script = null; reject(new Error("Could not load the payment window. Check your internet and try again.")); };
    document.body.appendChild(s);
  });
  return script;
}

export async function onlinePaymentEnabled() {
  try {
    const r = await fetch("/api/pay/config", { cache: "no-store" });
    return ((await r.json()) as { enabled?: boolean }).enabled === true;
  } catch {
    return false;
  }
}

export type PayResult = { status: "paid" | "closed" | "error"; orderId?: string; message?: string };

export async function payForOrder(orderNumber: string): Promise<PayResult> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token ?? "";
  const res = await fetch("/api/pay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderNumber }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) return p.paid ? { status: "paid", orderId: p.orderId } : { status: "error", message: p.error || `Error ${res.status}`, orderId: p.orderId };
  try {
    await loadCheckout();
  } catch (e) {
    return { status: "error", orderId: p.orderId, message: (e as Error).message };
  }
  return new Promise<PayResult>((resolve) => {
    const rzp = new window.Razorpay!({
      key: p.keyId,
      order_id: p.razorpayOrderId,
      amount: p.amount,
      currency: p.currency,
      name: "PCBDukaan",
      description: `Order ${p.orderNumber}`,
      image: `${window.location.origin}/icon-192.png`,
      prefill: p.prefill,
      notes: { order_number: p.orderNumber },
      theme: { color: "#1d4ed8" },
      handler: async (r: RazorpayResponse) => {
        const v = await fetch("/api/pay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(r),
        });
        const j = await v.json().catch(() => ({}));
        resolve(v.ok ? { status: "paid", orderId: p.orderId } : { status: "error", orderId: p.orderId, message: j.error });
      },
      modal: { ondismiss: () => resolve({ status: "closed", orderId: p.orderId }), confirm_close: true },
    });
    rzp.on("payment.failed", () => { /* Razorpay shows the error and lets the customer retry inside the window */ });
    rzp.open();
  });
}
