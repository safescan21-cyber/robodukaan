"use client";

import { useWishlist } from "./WishlistProvider";
import { useI18n } from "@/i18n/client";

export function WishlistButton({ productId, variant = "icon" }: { productId: string; variant?: "icon" | "full" }) {
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const active = has(productId);
  const heart = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinejoin="round" d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3h3C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20Z" />
    </svg>
  );
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        className={`flex items-center gap-2 text-sm font-medium ${active ? "text-red-600" : "text-slate-600 hover:text-red-600"}`}
        aria-pressed={active}
      >
        {heart}
        {active ? t("wishlist.in") : t("wishlist.add")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 ${active ? "text-red-600" : "text-slate-500 hover:text-red-600"}`}
      aria-label={active ? t("wishlist.remove") : t("wishlist.add")}
      aria-pressed={active}
    >
      {heart}
    </button>
  );
}
