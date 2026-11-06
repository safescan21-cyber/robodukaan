"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      aria-label={`Cart, ${count} items`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20h.01M17 20h.01" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {ready && count > 0 && (
        <span className="absolute -top-0.5 left-6 min-w-5 rounded-full bg-accent-500 px-1.5 text-center text-xs font-bold leading-5 text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
