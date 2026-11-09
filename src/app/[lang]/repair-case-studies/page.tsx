import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCaseStudies } from "@/lib/data";
import { getT } from "@/i18n/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Industrial PCB repair case studies – real VFD, SMPS and PLC repairs",
  description: "Real repair jobs from PCBDukaan: the fault, what we found, what we replaced and the result – VFD drives, SMPS, PLCs, servo drives and machine boards.",
  alternates: { canonical: "/repair-case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><List /></Suspense>
    </div>
  );
}

async function List() {
  const [{ t }, cases] = await Promise.all([getT(), getCaseStudies()]);
  return (
    <>
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: t("nav.caseStudies") }]} />
      <h1 className="text-3xl font-extrabold">Repair case studies</h1>
      <p className="mt-2 max-w-3xl text-slate-700">Real boards we repaired at component level – what failed, how we found it, and how the customer got their machine running again.</p>
      {cases.length === 0 ? (
        <p className="mt-6 rounded-md bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          Case studies are coming soon. Meanwhile, <Link href="/pcb-repair" className="font-semibold text-brand-700 hover:underline">send photos of your board for a free repair quote</Link>.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {cases.map((c) => (
            <Link key={c.id} href={`/repair-case-studies/${c.slug}`} className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200 hover:ring-brand-600">
              {c.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photos[0]} alt={c.title} loading="lazy" className="aspect-video w-full object-cover" />
              )}
              <div className="p-4">
                <p className="text-xs font-semibold uppercase text-accent-700">{[c.board_type, c.industry, c.city].filter(Boolean).join(" · ")}</p>
                <h2 className="mt-1 font-bold">{c.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.fault}</p>
                {c.published_at && <p className="mt-2 text-xs text-slate-500">{formatDate(c.published_at)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
