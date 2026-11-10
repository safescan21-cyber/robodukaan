"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link, { useI18n } from "@/i18n/client";
import { usePathname } from "next/navigation";

// Compare up to 4 products side by side (kept in this browser only).
const KEY = "pcbdukaan-compare";
export const COMPARE_MAX = 4;
type Ctx = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => boolean; remove: (id: string) => void; clear: () => void };
const CompareContext = createContext<Ctx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage once
      if (Array.isArray(v)) setIds(v.filter((x) => typeof x === "string").slice(0, COMPARE_MAX));
    } catch { /* ignore */ }
  }, []);
  const save = useCallback((next: string[]) => { setIds(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } }, []);
  const value = useMemo<Ctx>(() => ({
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => {
      if (ids.includes(id)) { save(ids.filter((x) => x !== id)); return true; }
      if (ids.length >= COMPARE_MAX) return false;
      save([...ids, id]); return true;
    },
    remove: (id) => save(ids.filter((x) => x !== id)),
    clear: () => save([]),
  }), [ids, save]);
  return <CompareContext.Provider value={value}>{children}<Suspense fallback={null}><CompareBar /></Suspense></CompareContext.Provider>;
}

export function useCompare() {
  const c = useContext(CompareContext);
  if (!c) throw new Error("useCompare must be used inside <CompareProvider>");
  return c;
}

export function CompareButton({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const { has, toggle } = useCompare();
  const { t } = useI18n();
  const [full, setFull] = useState(false);
  const on = has(productId);
  return (
    <button type="button" aria-pressed={on} title={full ? t("compare.max", { n: COMPARE_MAX }) : undefined}
      onClick={(e) => { e.preventDefault(); const ok = toggle(productId); setFull(!ok); if (!ok) setTimeout(() => setFull(false), 2500); }}
      className={`inline-flex items-center gap-1 rounded text-xs font-semibold ${compact ? "px-1.5 py-0.5" : "px-2.5 py-1.5 ring-1"} ${on ? "text-brand-700 ring-brand-600" : "text-slate-600 ring-slate-300 hover:text-brand-700"}`}>
      <span aria-hidden="true">⚖</span> {full ? t("compare.max", { n: COMPARE_MAX }) : on ? t("compare.added") : t("compare.add")}
    </button>
  );
}

function CompareBar() {
  const c = useContext(CompareContext);
  const { t } = useI18n();
  const path = usePathname();
  if (!c || c.ids.length === 0 || /\/compare$/.test(path ?? "")) return null;
  return (
    <div className="fixed bottom-4 start-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pe-1.5 ps-4 text-sm text-white shadow-lg print:hidden">
      <span>⚖ {t("compare.bar", { n: c.ids.length })}</span>
      <Link href="/compare" className="rounded-full bg-accent-500 px-3 py-1 font-semibold hover:bg-accent-600">{t("compare.now")}</Link>
      <button type="button" onClick={c.clear} aria-label={t("compare.clear")} className="rounded-full px-2 text-lg leading-none text-slate-300 hover:text-white">×</button>
    </div>
  );
}
