"use client";

import { useEffect, useState } from "react";
import Link, { useI18n } from "@/i18n/client";
import { formatINR } from "@/lib/format";

// "Recently viewed" – kept only in this browser (no login, nothing sent to the server).
const KEY = "pcbd-recent";
const MAX = 12;
type Item = { slug: string; name: string; price: number; image: string | null };

function read(): Item[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Item[]; } catch { return []; }
}

// Put on a product page: remembers that this product was viewed.
export function RecordView({ item }: { item: Item }) {
  useEffect(() => {
    try {
      const list = [item, ...read().filter((x) => x.slug !== item.slug)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch { /* private mode */ }
  }, [item]);
  return null;
}

export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the browser's list after mount
    setItems(read().filter((x) => x.slug !== exclude).slice(0, 8));
  }, [exclude]);
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200">
        <h2 className="-mb-0.5 border-b-2 border-accent-500 pb-2 text-lg font-bold uppercase tracking-wide">{t("recent.title")}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="w-36 shrink-0 rounded-md bg-white p-2 ring-1 ring-slate-200 hover:ring-brand-600">
            <span className="flex aspect-square items-center justify-center overflow-hidden rounded bg-gradient-to-br from-brand-50 to-accent-50">
              {p.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                : <span className="text-xs font-bold text-brand-600" aria-hidden="true">PCB</span>}
            </span>
            <span className="mt-1.5 line-clamp-2 text-xs text-slate-800">{p.name}</span>
            <span className="text-sm font-bold">{formatINR(p.price)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
