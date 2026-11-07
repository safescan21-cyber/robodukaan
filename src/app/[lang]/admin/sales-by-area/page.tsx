"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { formatINR } from "@/lib/format";

// What sells where: real orders grouped by state and city, with the top products in each.
// Useful for stocking and for talking to manufacturers about demand in each region.
type Row = { state: string; city: string; total: number; created_at: string; order_items: { name: string; sku: string; quantity: number; line_total: number }[] };
type Agg = { orders: number; revenue: number; products: Map<string, { name: string; sku: string; qty: number; revenue: number }> };

const PERIODS = [["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"], ["", "All time"]];

function add(map: Map<string, Agg>, key: string, r: Row) {
  const a = map.get(key) ?? { orders: 0, revenue: 0, products: new Map() };
  a.orders += 1;
  a.revenue += Number(r.total);
  for (const i of r.order_items) {
    const p = a.products.get(i.sku) ?? { name: i.name, sku: i.sku, qty: 0, revenue: 0 };
    p.qty += i.quantity;
    p.revenue += Number(i.line_total);
    a.products.set(i.sku, p);
  }
  map.set(key, a);
}
const top = (a: Agg, n = 5) => [...a.products.values()].sort((x, y) => y.qty - x.qty || y.revenue - x.revenue).slice(0, n);

export default function SalesByAreaPage() {
  const [days, setDays] = useState("90");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let req = getSupabase().from("orders").select("state, city, total, created_at, order_items(name, sku, quantity, line_total)")
      .neq("status", "cancelled").order("created_at", { ascending: false }).limit(5000);
    if (days) req = req.gte("created_at", new Date(Date.now() - Number(days) * 86400000).toISOString());
    req.then(({ data, error }) => { setError(error?.message ?? null); setRows((data as Row[]) ?? []); });
  }, [days]);

  const { all, states, cities } = useMemo(() => {
    const all = new Map<string, Agg>(), states = new Map<string, Agg>(), cities = new Map<string, Agg>();
    for (const r of rows ?? []) {
      add(all, "India", r);
      add(states, r.state || "Unknown", r);
      add(cities, `${(r.city || "?").trim()}, ${r.state}`, r);
    }
    const sort = (m: Map<string, Agg>) => [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    return { all: all.get("India"), states: sort(states), cities: sort(cities).slice(0, 15) };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sales by area</h1>
        <div className="flex gap-2">
          {PERIODS.map(([v, l]) => (
            <button key={v} onClick={() => setDays(v)} className={`rounded-full px-3 py-1 text-sm ring-1 ${days === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}>{l}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-600">Orders (not cancelled) grouped by delivery state and city. Totals include GST.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {rows === null && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {rows && rows.length === 0 && <p className="rounded-md bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">No orders in this period yet.</p>}

      {all && (
        <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Best sellers – all India</h2>
          <p className="text-xs text-slate-500">{all.orders} orders · {formatINR(all.revenue)}</p>
          <ProductTable items={top(all, 10)} />
        </section>
      )}

      {states.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {states.map(([state, a]) => (
            <div key={state} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">{state}</h2>
                <p className="text-xs text-slate-500">{a.orders} order{a.orders === 1 ? "" : "s"} · {formatINR(a.revenue)}</p>
              </div>
              <ProductTable items={top(a)} />
            </div>
          ))}
        </section>
      )}

      {cities.length > 0 && (
        <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Top cities</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">City</th><th>Orders</th><th className="text-right">Sales</th><th className="hidden sm:table-cell">Best seller</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cities.map(([city, a]) => (
                <tr key={city}><td className="py-1.5">{city}</td><td>{a.orders}</td><td className="text-right">{formatINR(a.revenue)}</td><td className="hidden truncate ps-3 text-slate-600 sm:table-cell">{top(a, 1)[0]?.name}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ProductTable({ items }: { items: { name: string; sku: string; qty: number; revenue: number }[] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <tbody className="divide-y divide-slate-100">
        {items.map((p) => (
          <tr key={p.sku}>
            <td className="py-1.5 pe-2"><span className="line-clamp-1">{p.name}</span><span className="text-xs text-slate-400">{p.sku}</span></td>
            <td className="whitespace-nowrap text-right font-semibold">{p.qty} pcs</td>
            <td className="whitespace-nowrap ps-3 text-right text-slate-600">{formatINR(p.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
