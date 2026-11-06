"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import { CouponBox, useCoupon } from "@/components/CouponBox";
import { RequireAuth } from "@/components/RequireAuth";
import { postAsUser } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase-browser";
import { formatINR, GST_RATE, gstFor, shippingFor } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/constants";
import type { Address } from "@/lib/types";

type Form = { name: string; phone: string; email: string; address_line: string; city: string; state: string; pincode: string; notes: string };
const EMPTY: Form = { name: "", phone: "", email: "", address_line: "", city: "", state: "", pincode: "", notes: "" };

function Checkout() {
  const { items, ready, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const { coupon, discount } = useCoupon();
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shipping = shippingFor(subtotal);
  const gst = gstFor(subtotal - discount + shipping);

  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from("addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = (data as Address[]) ?? [];
        setAddresses(list);
        const a = list[0];
        setForm((f) => ({
          ...f,
          email: f.email || user.email || "",
          name: f.name || a?.full_name || profile?.full_name || "",
          phone: f.phone || a?.phone || profile?.phone || "",
          ...(a && !f.address_line ? { address_line: a.address_line, city: a.city, state: a.state, pincode: a.pincode } : {}),
        }));
        if (list.length) setSaveAddress(false);
      });
  }, [user, profile]);

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="h-40 animate-pulse rounded-md bg-slate-100" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white">Return to shop</Link>
      </div>
    );
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function applyAddress(a: Address) {
    setForm((f) => ({ ...f, name: a.full_name, phone: a.phone, address_line: a.address_line, city: a.city, state: a.state, pincode: a.pincode }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("place_order", {
      items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      customer: form,
      coupon_code: coupon,
    });
    if (error) {
      setError(error.message || "Could not place your order. Please try again.");
      setSubmitting(false);
      return;
    }
    if (user && saveAddress) {
      await supabase.from("addresses").insert({
        user_id: user.id, full_name: form.name, phone: form.phone, address_line: form.address_line,
        city: form.city, state: form.state, pincode: form.pincode, is_default: addresses.length === 0,
      });
    }
    try {
      sessionStorage.setItem("robodukaan-last-order", JSON.stringify(data));
    } catch {
      /* ignore */
    }
    await postAsUser("/api/email/order", { orderNumber: data.order_number });
    clear();
    router.push(`/order-success?order=${encodeURIComponent(data.order_number)}`);
  }

  const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold">Checkout</h1>
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {addresses.length > 0 && (
            <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Saved addresses</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => {
                  const selected = form.address_line === a.address_line && form.pincode === a.pincode;
                  return (
                    <button type="button" key={a.id} onClick={() => applyAddress(a)}
                      className={`rounded-md border p-3 text-left text-sm ${selected ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-600"}`}>
                      <span className="text-xs font-bold uppercase text-brand-700">{a.label}</span>
                      <span className="block font-semibold">{a.full_name} · {a.phone}</span>
                      <span className="block text-slate-600">{a.address_line}, {a.city}, {a.state} – {a.pincode}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Billing &amp; shipping details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Full name *<input value={form.name} onChange={set("name")} required minLength={2} autoComplete="name" className={field} /></label>
              <label className="text-sm font-medium">Mobile number *<input value={form.phone} onChange={set("phone")} required type="tel" inputMode="numeric" pattern="(\+?91)?[6-9][0-9]{9}" placeholder="10-digit mobile" autoComplete="tel" className={field} /></label>
              <label className="text-sm font-medium sm:col-span-2">Email {user ? "" : "(optional)"}<input value={form.email} onChange={set("email")} type="email" autoComplete="email" className={field} /></label>
              <label className="text-sm font-medium sm:col-span-2">Street address *<textarea value={form.address_line} onChange={set("address_line")} required minLength={5} rows={2} placeholder="House no., building, street, area" autoComplete="street-address" className={field} /></label>
              <label className="text-sm font-medium">Town / City *<input value={form.city} onChange={set("city")} required autoComplete="address-level2" className={field} /></label>
              <label className="text-sm font-medium">PIN code *<input value={form.pincode} onChange={set("pincode")} required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" className={field} /></label>
              <label className="text-sm font-medium sm:col-span-2">State *
                <select value={form.state} onChange={set("state")} required className={field}>
                  <option value="" disabled>Select a state</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Order notes (optional)<input value={form.notes} onChange={set("notes")} maxLength={300} placeholder="Notes about your order, e.g. delivery instructions" className={field} /></label>
              {user && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                  Save this address to my account
                </label>
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="border-b border-slate-200 pb-3 text-sm font-bold uppercase tracking-wide">Your order</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="text-slate-700">{i.name} <span className="font-semibold">× {i.quantity}</span></span>
                <span className="shrink-0">{formatINR(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <CouponBox />
          <dl className="space-y-2 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon ({coupon})</dt><dd>− {formatINR(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between"><dt>GST ({GST_RATE}%)</dt><dd>{formatINR(gst)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatINR(subtotal - discount + shipping + gst)}</dd></div>
          </dl>
          <div className="rounded-md border-2 border-brand-600 bg-brand-50 p-3 text-sm">
            <p className="font-semibold">💵 Cash on delivery</p>
            <p className="text-xs text-slate-600">Pay in cash or by UPI when your order arrives.</p>
          </div>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-md bg-accent-500 px-4 py-3 font-bold uppercase tracking-wide text-white hover:bg-accent-600 disabled:opacity-60">
            {submitting ? "Placing order…" : "Place order"}
          </button>
          <p className="text-center text-xs text-slate-500">Final prices and discounts are confirmed when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  );
}
