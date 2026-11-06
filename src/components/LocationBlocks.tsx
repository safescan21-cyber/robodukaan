import Link from "next/link";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

export function CategoryLinks({ slugs, categories }: { slugs: string[]; categories: Category[] }) {
  const list = slugs.map((s) => categories.find((c) => c.slug === s)).filter(Boolean) as Category[];
  if (!list.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <Link key={c.slug} href={`/category/${c.slug}`} className="group flex items-center gap-3 rounded-md bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white">
            <CategoryIcon name={c.icon} className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-semibold group-hover:text-brand-700">{c.name}</span>
            {c.description && <span className="line-clamp-1 text-xs text-slate-500">{c.description}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function RepairCta({ place }: { place: string }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-lg font-bold">Faulty board in {place}?</p>
        <p className="text-sm text-brand-100">Upload photos online and get a free repair quote, usually within 1–2 working days. Courier pickup-to-return across India.</p>
      </div>
      <Link href="/pcb-repair" className="shrink-0 rounded-md bg-accent-500 px-5 py-2.5 font-bold text-white hover:bg-accent-600">Get a repair quote</Link>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <details key={f.q} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <summary className="cursor-pointer font-semibold">{f.q}</summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
