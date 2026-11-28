"use client";

import { useMemo, useState } from "react";
import Link, { useRouter } from "@/i18n/client";
import type { FinderItem } from "@/lib/cnc-machines";
import { MachineImage, type MachinePhoto } from "./MachineArt";

const TYPES: [string, string][] = [["", "All types"], ["vmc", "VMC"], ["hmc", "HMC"], ["5axis", "5-axis"], ["drill-tap", "Drill-tap"], ["turning", "Turning / lathe"], ["vtl", "VTL"]];

// Search, filter and pick up to 4 machines to compare.
export function CncFinder({ items, makers, photos = {} }: { items: FinderItem[]; makers: { slug: string; name: string }[]; photos?: Record<string, MachinePhoto> }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [maker, setMaker] = useState("");
  const [minX, setMinX] = useState("");
  const [minRpm, setMinRpm] = useState("");
  const [sort, setSort] = useState("maker");
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    const r = items.filter((m) =>
      (!type || m.t === type) && (!maker || m.mk === maker) &&
      (!minX || (m.x ?? 0) >= Number(minX)) && (!minRpm || (m.rpm ?? 0) >= Number(minRpm)) &&
      w.every((x) => `${m.mn} ${m.md} ${m.sr} ${m.taper}`.toLowerCase().includes(x)));
    const by: Record<string, (a: FinderItem, b: FinderItem) => number> = {
      maker: (a, b) => a.mn.localeCompare(b.mn) || a.md.localeCompare(b.md, undefined, { numeric: true }),
      x: (a, b) => (b.x ?? 0) - (a.x ?? 0),
      rpm: (a, b) => (b.rpm ?? 0) - (a.rpm ?? 0),
      tools: (a, b) => (b.tools ?? 0) - (a.tools ?? 0),
    };
    return r.sort(by[sort]);
  }, [items, q, type, maker, minX, minRpm, sort]);

  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length >= 4 ? p : [...p, s]));
  const field = "w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500";

  return (
    <div>
      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-6">
        <label className="lg:col-span-2"><span className="sr-only">Search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model, series or taper – e.g. BMV 50, RDX, BT-40" className={field} /></label>
        <label><span className="sr-only">Machine type</span><select value={type} onChange={(e) => setType(e.target.value)} className={field}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label><span className="sr-only">Manufacturer</span><select value={maker} onChange={(e) => setMaker(e.target.value)} className={field}><option value="">All manufacturers</option>{makers.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
        <label><span className="sr-only">Minimum X travel / turning diameter</span><select value={minX} onChange={(e) => setMinX(e.target.value)} className={field}><option value="">Any X travel / turning Ø</option>{[300, 500, 600, 800, 1000, 1200].map((v) => <option key={v} value={v}>X / Ø ≥ {v} mm</option>)}</select></label>
        <label><span className="sr-only">Minimum spindle speed</span><select value={minRpm} onChange={(e) => setMinRpm(e.target.value)} className={field}><option value="">Any spindle speed</option>{[3000, 6000, 8000, 10000, 12000].map((v) => <option key={v} value={v}>≥ {v.toLocaleString("en-IN")} rpm</option>)}</select></label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600"><b>{list.length}</b> machines · tick up to 4 to compare</p>
        <label className="flex items-center gap-2">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border-0 bg-white px-2 py-1.5 ring-1 ring-slate-200">
            <option value="maker">Maker & model</option><option value="x">Largest X / turning Ø</option><option value="rpm">Highest spindle speed</option><option value="tools">Most tools</option>
          </select>
        </label>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="w-10 px-3 py-3"><span className="sr-only">Compare</span></th><th className="px-3 py-3">Machine</th><th className="px-3 py-3">Type</th><th className="px-3 py-3 text-end">X / Ø (mm)</th><th className="px-3 py-3 text-end">Y (mm)</th><th className="px-3 py-3 text-end">Z / length (mm)</th><th className="px-3 py-3 text-end">Max rpm</th><th className="px-3 py-3">Taper / nose</th><th className="px-3 py-3 text-end">Tools</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((m) => {
              const on = picked.includes(m.s);
              return (
                <tr key={m.s} className={on ? "bg-brand-50" : "hover:bg-slate-50"}>
                  <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Compare ${m.mn} ${m.md}`} checked={on} disabled={!on && picked.length >= 4} onChange={() => toggle(m.s)} className="h-4 w-4 accent-brand-600" /></td>
                  <td className="px-3 py-2.5">
                    <Link href={`/cnc-machines/${m.s}`} className="flex items-center gap-3 hover:text-brand-700">
                      <MachineImage type={m.t} photo={photos[m.s]} alt={`${m.mn} ${m.md}`} className="h-12 w-16 shrink-0 rounded-md ring-1 ring-slate-200" />
                      <span><span className="block font-semibold text-slate-900">{m.mn} {m.md}</span><span className="block text-xs text-slate-500">{m.sr}</span></span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{TYPES.find(([v]) => v === m.t)?.[1] ?? m.t}</span></td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{m.x ?? "–"}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{m.y ?? "–"}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{m.z ?? "–"}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{m.rpm ? m.rpm.toLocaleString("en-IN") : "–"}</td>
                  <td className="px-3 py-2.5">{m.taper || "–"}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{m.tools ?? "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No machine matches these filters.</p>}
      </div>

      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Compare ({picked.length}/4):</span>
            {picked.map((s) => { const m = items.find((x) => x.s === s)!; return (
              <button key={s} onClick={() => toggle(s)} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pe-3 ps-0.5 text-xs font-semibold hover:bg-red-50 hover:text-red-700">
                <MachineImage type={m.t} photo={photos[s]} alt="" className="h-7 w-9 rounded-full" />{m.mn} {m.md} ✕
              </button>
            ); })}
            <button disabled={picked.length < 2} onClick={() => router.push(`/cnc-machines/compare?m=${picked.join(",")}`)}
              className="ms-auto rounded-lg bg-accent-500 px-5 py-2 text-sm font-bold text-white hover:bg-accent-600 disabled:opacity-50">
              {picked.length < 2 ? "Pick one more" : "Compare now →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
