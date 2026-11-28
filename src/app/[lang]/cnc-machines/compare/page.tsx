import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MachineImage } from "@/components/MachineArt";
import { getCncPhotos } from "@/lib/data";
import { MACHINES, SPEC_ROWS, TYPE_SHORT, bestIndexes, fullName, getMachine, isTurning, type CncType } from "@/lib/cnc-machines";

export const metadata: Metadata = {
  title: "Compare CNC machines side by side",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cnc-machines" },
};

export default function CncComparePage(props: PageProps<"/[lang]/cnc-machines/compare">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ label: "CNC machine comparison", href: "/cnc-machines" }, { label: "Compare" }]} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Compare searchParams={props.searchParams} /></Suspense>
    </div>
  );
}

async function Compare({ searchParams }: Pick<PageProps<"/[lang]/cnc-machines/compare">, "searchParams">) {
  const sp = await searchParams;
  const raw = typeof sp.m === "string" ? sp.m : "";
  const list = [...new Set(raw.split(","))].map(getMachine).filter((m): m is NonNullable<typeof m> => !!m).slice(0, 4);
  if (list.length < 2) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold">Pick machines to compare</h1>
        <p className="mt-2 text-slate-600">Choose 2 to 4 machines in the list.</p>
        <Link href="/cnc-machines" className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">Open the CNC machine list</Link>
      </div>
    );
  }
  const photos = await getCncPhotos();
  const anyTurning = list.some((m) => isTurning(m.type));
  const anyMilling = list.some((m) => !isTurning(m.type));
  const rows = SPEC_ROWS.filter((r) => (!r.turning || anyTurning) && (!r.milling || anyMilling) && list.some((m) => m.specs[r.key]));
  const share = `https://wa.me/?text=${encodeURIComponent(`CNC machine comparison: ${list.map(fullName).join(" vs ")} – https://pcbdukaan.com/cnc-machines/compare?m=${list.map((m) => m.slug).join(",")}`)}`;
  const others = MACHINES.filter((x) => x.type === list[0].type && !list.includes(x)).slice(0, 8);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{list.map(fullName).join(" vs ")}</h1>
        <a href={share} target="_blank" rel="noopener" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Share on WhatsApp</a>
      </div>
      <p className="mt-1 text-sm text-slate-600"><span className="rounded bg-emerald-100 px-1.5 font-semibold text-emerald-800">Green</span> = best value in the row (where a bigger or smaller number is clearly better).</p>
      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-white">
              <th className="w-48 px-4 py-3 font-semibold">Specification</th>
              {list.map((m) => (
                <th key={m.slug} className="px-4 py-3 align-top">
                  <MachineImage type={m.type} photo={photos[m.slug]} alt={fullName(m)} className="mb-2 h-28 w-full max-w-[220px] rounded-lg bg-white" />
                  <Link href={`/cnc-machines/${m.slug}`} className="font-bold hover:underline">{fullName(m)}</Link>
                  <span className="block text-xs font-normal text-slate-300">{TYPE_SHORT[m.type as CncType]} · {m.series}</span>
                  <Link href={`/cnc-machines/compare?m=${list.filter((x) => x !== m).map((x) => x.slug).join(",")}`} className="mt-1 inline-block text-xs font-normal text-slate-400 hover:text-white">✕ remove</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const vals = list.map((m) => m.specs[r.key]);
              const best = bestIndexes(vals, r.better);
              return (
                <tr key={r.key}>
                  <th scope="row" className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600">{r.label}</th>
                  {vals.map((v, i) => <td key={i} className={`px-4 py-2.5 ${best.includes(i) ? "bg-emerald-50 font-bold text-emerald-800" : ""}`}>{v ?? "–"}</td>)}
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="bg-slate-50 px-4 py-2.5 text-left font-medium text-slate-600">Source</th>
              {list.map((m) => <td key={m.slug} className="px-4 py-2.5 text-xs"><a href={m.source} target="_blank" rel="noopener" className="text-brand-700 underline">Maker spec page ↗</a></td>)}
            </tr>
          </tbody>
        </table>
      </div>
      {list.length < 4 && others.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold">Add another machine</h2>
          <p className="mt-2 flex flex-wrap gap-2">
            {others.map((x) => <Link key={x.slug} href={`/cnc-machines/compare?m=${[...list, x].map((m) => m.slug).join(",")}`} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-300 hover:ring-brand-600">+ {fullName(x)}</Link>)}
          </p>
        </section>
      )}
      <p className="mt-6 text-xs text-slate-500">Values as published by each manufacturer; standards for accuracy and power ratings differ between makers. Confirm with the manufacturer before buying.</p>
    </>
  );
}
