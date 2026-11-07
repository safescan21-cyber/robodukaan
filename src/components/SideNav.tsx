"use client";

import Link from "@/i18n/client";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";

export function SideNav({ title, items, footer }: { title: string; items: { href: string; label: string; icon: string; exact?: boolean }[]; footer?: React.ReactNode }) {
  const pathname = stripLocale(usePathname());
  return (
    <aside className="h-fit rounded-md bg-white ring-1 ring-slate-200">
      <p className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">{title}</p>
      {/* Phones: items wrap onto a few lines so every link (incl. Log out) is visible without sideways scrolling. */}
      <nav className="flex flex-wrap gap-1 p-2 lg:flex-col lg:flex-nowrap">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}
              className={`flex shrink-0 items-center gap-3 rounded px-3 py-2 text-sm ${active ? "bg-brand-600 font-semibold text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {footer}
      </nav>
    </aside>
  );
}
