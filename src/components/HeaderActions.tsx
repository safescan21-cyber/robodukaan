"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { useAuth } from "./AuthProvider";
import { formatINR } from "@/lib/format";
import { LogoutButton } from "./LogoutButton";

export function HeaderActions() {
  const { count, subtotal, ready } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, profile, isAdmin } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <div className="ml-auto flex items-center gap-1 sm:gap-3 lg:ml-0">
      <Link href={user ? "/account" : "/login"} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-xs text-slate-500">{user ? `Hello, ${firstName}` : "Hello, sign in"}</span>
          <span className="block text-sm font-semibold text-slate-800">{user ? "My account" : "Login / Register"}</span>
        </span>
      </Link>
      {isAdmin && (
        <Link href="/admin" className="hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 sm:block">
          Admin
        </Link>
      )}
      {user && (
        <LogoutButton
          icon={false}
          className="hidden rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-300 hover:bg-red-50 hover:text-red-600 hover:ring-red-300 md:block"
        />
      )}
      <Link href="/wishlist" className="relative rounded-md p-1.5 hover:bg-slate-100" aria-label={`Wishlist, ${wishCount} items`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <path strokeLinejoin="round" d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3h3C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20Z" />
        </svg>
        {wishCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{wishCount}</span>
        )}
      </Link>
      <Link href="/cart" className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100" aria-label={`Cart, ${count} items`}>
        <span className="relative">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20h.01M17 20h.01" />
          </svg>
          {ready && count > 0 && (
            <span className="absolute -right-2 -top-1.5 min-w-5 rounded-full bg-accent-500 px-1 text-center text-[11px] font-bold leading-5 text-white">{count}</span>
          )}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-xs text-slate-500">My cart</span>
          <span className="block text-sm font-semibold text-slate-800">{formatINR(ready ? subtotal : 0)}</span>
        </span>
      </Link>
    </div>
  );
}
