"use client";

import Link from "@/i18n/client";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { useAuth } from "./AuthProvider";
import { LogoutButton } from "./LogoutButton";
import { useI18n } from "@/i18n/client";

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();


  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md p-1 hover:bg-slate-100 lg:hidden" aria-label={t("menu.open")}>
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu.label")}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-80 max-w-[85%] flex-col overflow-y-auto bg-white shadow-xl" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
            <div className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
              <span className="font-semibold">{user ? t("menu.myStore") : t("menu.welcome")}</span>
              <button onClick={() => setOpen(false)} aria-label={t("menu.close")} className="text-2xl leading-none">×</button>
            </div>
            <div className="flex gap-2 border-b border-slate-200 p-4 text-sm">
              {user ? (
                <>
                  <Link href="/account" className="flex-1 rounded-md bg-brand-600 py-2 text-center font-semibold text-white">{t("account.my")}</Link>
                  {isAdmin && <Link href="/admin" className="flex-1 rounded-md bg-slate-900 py-2 text-center font-semibold text-white">Admin</Link>}
                </>
              ) : (
                <>
                  <Link href="/login" className="flex-1 rounded-md bg-brand-600 py-2 text-center font-semibold text-white">{t("auth.login")}</Link>
                  <Link href="/register" className="flex-1 rounded-md py-2 text-center font-semibold text-brand-700 ring-1 ring-brand-600">{t("auth.register")}</Link>
                </>
              )}
            </div>
            <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("footer.categories")}</p>
            <ul className="py-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-50">
                    <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="border-t border-slate-200 py-2 text-sm">
              <li><Link href="/pcb-repair" className="block px-4 py-2.5 font-semibold text-accent-600 hover:bg-brand-50">🔧 {t("nav.pcbRepairService")}</Link></li>
              <li><Link href="/products?new=1" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.newArrivals")}</Link></li>
              <li><Link href="/products?sort=best-selling" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.bestSellers")}</Link></li>
              <li><Link href="/bulk-quote" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.bulkQuote")}</Link></li>
              <li><Link href="/fault-codes" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.faultCodes")}</Link></li>
              <li><Link href="/repair-case-studies" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.caseStudies")}</Link></li>
              <li><Link href="/contact" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.contact")}</Link></li>
              <li><Link href="/wishlist" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.wishlist")}</Link></li>
              <li><Link href="/track" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.trackOrder")}</Link></li>
              <li><Link href="/site-map" className="block px-4 py-2.5 hover:bg-brand-50">{t("nav.sitemap")}</Link></li>
              {user && <li><LogoutButton className="w-full px-4 py-2.5 text-left font-semibold text-red-600 hover:bg-red-50" icon={false} /></li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
