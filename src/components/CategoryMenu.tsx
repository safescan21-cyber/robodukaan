"use client";

import Link from "@/i18n/client";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { useI18n } from "@/i18n/client";

export function CategoryMenu({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className="flex h-full w-64 items-center gap-3 bg-brand-900 px-4 py-3 text-sm font-semibold"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {t("nav.shopByCategories")}
        <svg viewBox="0 0 20 20" className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden="true">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>
      {open && (
        <ul onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }} className="absolute start-0 top-full w-64 overflow-hidden rounded-b-md border border-slate-200 bg-white py-1 text-slate-800 shadow-xl">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-50 hover:text-brand-700">
                <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                {c.name}
              </Link>
            </li>
          ))}
          <li className="border-t border-slate-100">
            <Link href="/products" className="block px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              {t("nav.viewAllProducts")} →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
