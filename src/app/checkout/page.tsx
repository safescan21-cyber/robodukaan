"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { supabase } from "@/lib/supabase";
import { formatINR, shippingFor } from "@/lib/format";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export default function CheckoutPage() {
  const { items, ready, subtotal, clear } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shipping = shippingFor(subtotal);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">Browse products</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(
      ["name", "phone", "email", "address_line", "city", "state", "pincode", "notes"].map((k) => [k, String(form.get(k) ?? "")]),
    );
    const { data, error } = await supabase.rpc("place_order", {
      items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      customer,
    });
    if (error) {
      setError(error.message || "Could not place your order. Please try again.");
      setSubmitting(false);
      return;
    }
    try {
      sessionStorage.setItem("robodukaan-last-order", JSON.stringify({ ...data, phone: customer.phone }));
    } catch {
      /* ignore */
    }
    clear();
    router.push(`/order-success?order=${encodeURIComponent(data.order_number)}`);
  }

  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <fieldset className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
            <legend className="px-1 text-lg font-bold">Contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Full name *<input name="name" required minLength={2} autoComplete="name" className={field} /></label>
              <label className="text-sm font-medium">Mobile number *<input name="phone" required type="tel" inputMode="numeric" pattern="(\+?91)?[6-9][0-9]{9}" placeholder="10-digit mobile" autoComplete="tel" className={field} /></label>
              <label className="text-sm font-medium sm:col-span-2">Email (optional)<input name="email" type="email" autoComplete="email" className={field} /></label>
            </div>
          </fieldset>
          <fieldset className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
            <legend className="px-1 text-lg font-bold">Delivery address</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">Address (house no., street, area) *<textarea name="address_line" required minLength={5} rows={2} autoComplete="street-address" className={field} /></label>
              <label className="text-sm font-medium">City *<input name="city" required autoComplete="address-level2" className={field} /></label>
              <label className="text-sm font-medium">PIN code *<input name="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" className={field} /></label>
              <label className="text-sm font-medium sm:col-span-2">State *
                <select name="state" required defaultValue="" className={field}>
                  <option value="" disabled>Select state</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Order notes (optional)<input name="notes" maxLength={300} className={field} /></label>
            </div>
          </fieldset>
          <fieldset className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
            <legend className="px-1 text-lg font-bold">Payment</legend>
            <label className="flex items-center gap-3 rounded-lg border-2 border-brand-600 bg-brand-50 p-4">
              <input type="radio" name="payment" defaultChecked readOnly className="h-4 w-4 accent-brand-600" />
              <span>
                <span className="block font-semibold">Cash on delivery</span>
                <span className="text-sm text-slate-600">Pay in cash or UPI when your order arrives.</span>
              </span>
            </label>
          </fieldset>
        </div>

        <aside className="h-fit rounded-xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Your order</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="text-slate-700">{i.name} × {i.quantity}</span>
                <span className="shrink-0">{formatINR(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatINR(subtotal + shipping)}</dd></div>
          </dl>
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={submitting} className="mt-5 w-full rounded-lg bg-accent-500 px-4 py-3 font-semibold text-white hover:bg-accent-600 disabled:opacity-60">
            {submitting ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">Final prices are confirmed when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}
