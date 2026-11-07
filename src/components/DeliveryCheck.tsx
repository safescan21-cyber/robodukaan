"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { FREE_SHIPPING_FROM } from "@/lib/format";

const KEY = "pcbd-pincode";
// Estimate from the PIN code (working days after dispatch). Matches the shipping policy (2–7 days);
// it's an estimate, not a courier lookup.
const METRO = ["11", "40", "41", "56", "60", "70", "50", "38", "39", "30", "45", "14", "20"]; // Delhi NCR, Mumbai, Pune, Bengaluru, Chennai, Kolkata, Hyderabad, Ahmedabad, Surat, Jaipur, Indore, Ludhiana, Noida…
const REMOTE = ["18", "19", "78", "79", "737", "744", "6825"]; // J&K/Ladakh, North-East, Sikkim, Andaman, Lakshadweep

function estimate(pin: string): [number, number] {
  if (REMOTE.some((p) => pin.startsWith(p))) return [6, 9];
  if (METRO.some((p) => pin.startsWith(p))) return [2, 4];
  return [3, 7];
}

// Adds n working days (Mon–Sat) to today, after a 1-day dispatch window.
function addWorkingDays(n: number) {
  const d = new Date();
  let left = n + 1;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}

export function DeliveryCheck({ price }: { price: number }) {
  const { t, locale } = useI18n();
  const [pin, setPin] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the visitor's PIN code
      if (saved && /^[1-9]\d{5}$/.test(saved)) { setPin(saved); setChecked(saved); }
    } catch { /* private mode */ }
  }, []);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const p = pin.replace(/\s/g, "");
    if (!/^[1-9]\d{5}$/.test(p)) { setError(true); setChecked(null); return; }
    setError(false);
    setChecked(p);
    try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
  }

  const fmt = (d: Date) => d.toLocaleDateString(locale === "en" ? "en-IN" : locale, { weekday: "short", day: "numeric", month: "short" });
  const range = checked ? estimate(checked) : null;

  return (
    <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
      <form onSubmit={check} className="flex items-center gap-2">
        <label htmlFor="pin-check" className="shrink-0 text-sm font-semibold">🚚 {t("delivery.title")}</label>
        <input id="pin-check" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} placeholder={t("delivery.placeholder")}
          autoComplete="postal-code" className="w-28 min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600" />
        <button className="shrink-0 rounded bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">{t("delivery.check")}</button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{t("delivery.invalid")}</p>}
      {range && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-700" aria-live="polite">
          <li>📦 <b>{t("delivery.result", { from: fmt(addWorkingDays(range[0])), to: fmt(addWorkingDays(range[1])) })}</b></li>
          <li>💵 {t("delivery.cod")}</li>
          <li>{price >= FREE_SHIPPING_FROM ? `✓ ${t("cart.free")} – ${t("cart.shipping")}` : t("product.freeShipOver", { amount: `₹${FREE_SHIPPING_FROM}` })}</li>
        </ul>
      )}
    </div>
  );
}
