"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/i18n/client";

export type FaultItem = { b: string; bs: string; c: string; s: string; n: string; a: string; k: string };

const norm = (x: string) => x.toLowerCase().replace(/[\s._\-/:]+/g, "");

// Type an error code ("oc", "AL-014", "F30001", "E.OC1") or a word ("earth fault") – matching pages appear at once.
export function FaultSearch({ items, autoFocus = false }: { items: FaultItem[]; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      const fromUrl = new URLSearchParams(window.location.search).get("q");
      if (fromUrl) setQ(fromUrl);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const hits = useMemo(() => {
    const raw = q.trim().toLowerCase();
    if (raw.length < 2) return [];
    const nq = norm(raw);
    const words = raw.split(/\s+/).filter((w) => w.length > 1);
    return items
      .map((it) => {
        const codes = [it.c, ...it.c.split(" / "), ...it.a.split("|")].filter(Boolean).map(norm);
        let score = 0;
        if (codes.some((c) => c === nq)) score = 100;
        else if (codes.some((c) => c.startsWith(nq))) score = 60;
        else if (nq.length >= 3 && codes.some((c) => c.includes(nq))) score = 40;
        const text = `${it.b} ${it.n}`.toLowerCase();
        if (words.length && words.every((w) => text.includes(w) || codes.some((c) => c.includes(norm(w))))) score = Math.max(score, 30);
        return { it, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [q, items]);

  return (
    <div>
      <label htmlFor="fault-q" className="sr-only">Search error code</label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input id="fault-q" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} autoComplete="off"
          placeholder="Type the code on the display – e.g. oc, AL-014, F30001, E.OC1, SF LED"
          className="w-full rounded-xl border-0 bg-white py-4 pe-4 ps-12 text-base text-slate-900 shadow-lg ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-accent-500" />
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-3 overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg ring-1 ring-slate-200">
          {hits.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">No code found for “{q}”. Check the brand list below, or <Link href="/pcb-repair" className="font-semibold text-brand-700 underline">send us a photo of the display</Link>.</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
              {hits.map(({ it }) => (
                <li key={`${it.bs}/${it.s}`}>
                  <Link href={`/fault-codes/${it.bs}/${it.s}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50">
                    <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-bold text-white">{it.c.split(" / ")[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{it.n}</span>
                      <span className="block text-xs text-slate-500">{it.b} · {it.k === "servo" ? "Servo drive" : it.k === "plc" ? "PLC" : "VFD / inverter"}</span>
                    </span>
                    <span aria-hidden="true" className="text-brand-600 rtl:-scale-x-100">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
