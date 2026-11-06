"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useCart } from "./CartProvider";

export type CouponResult = { valid: boolean; code?: string; discount?: number; message: string };

// Applies a coupon code and reports the discount for the current subtotal.
export function useCoupon() {
  const { coupon, setCoupon, subtotal, ready } = useCart();
  const [result, setResult] = useState<CouponResult | null>(null);

  useEffect(() => {
    if (!ready || !coupon || subtotal <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when there's nothing to check
      setResult(null);
      return;
    }
    let active = true;
    getSupabase()
      .rpc("check_coupon", { p_code: coupon, p_subtotal: subtotal })
      .then(({ data }) => {
        if (active) setResult((data as CouponResult) ?? null);
      });
    return () => {
      active = false;
    };
  }, [coupon, subtotal, ready]);

  return { coupon, setCoupon, result, discount: result?.valid ? Number(result.discount ?? 0) : 0 };
}

export function CouponBox() {
  const { coupon, setCoupon, result } = useCoupon();
  const [code, setCode] = useState("");

  if (coupon) {
    return (
      <div className={`rounded-md p-3 text-sm ${result?.valid === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold">{coupon}</span>
          <button onClick={() => setCoupon(null)} className="text-xs font-semibold underline">Remove</button>
        </div>
        {result && <p className="mt-1 text-xs">{result.message}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) setCoupon(code.trim().toUpperCase());
      }}
      className="flex"
    >
      <label htmlFor="coupon" className="sr-only">Coupon code</label>
      <input
        id="coupon"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Coupon code"
        className="w-full rounded-l-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-brand-600"
      />
      <button className="rounded-r-md bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700">Apply</button>
    </form>
  );
}
