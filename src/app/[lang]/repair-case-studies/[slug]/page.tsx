import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getCaseStudy } from "@/lib/data";
import { getRepairService } from "@/lib/seo-content";
import { getT } from "@/i18n/server";
import { formatDate } from "@/lib/format";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
const clip = (s: string, n = 158) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata(props: PageProps<"/[lang]/repair-case-studies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getCaseStudy(slug);
  if (!c) return { title: "Not found" };
  return {
    title: c.title,
    description: clip(`${c.fault} ${c.repair}`),
    alternates: { canonical: `/repair-case-studies/${c.slug}` },
    openGraph: c.photos[0] ? { images: [{ url: c.photos[0] }] } : undefined,
  };
}

export default function CaseStudyPage(props: PageProps<"/[lang]/repair-case-studies/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Content params={props.params} /></Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/[lang]/repair-case-studies/[slug]">, "params">) {
  const { slug } = await params;
  const [c, { t }] = await Promise.all([getCaseStudy(slug), getT()]);
  if (!c) notFound();
  const service = c.service_slug ? getRepairService(c.service_slug) : undefined;
  const facts = [
    ["Board", c.board_type], ["Brand / model", c.brand_model], ["Industry", c.industry], ["City", c.city],
    ["Turnaround", c.turnaround_days != null ? `${c.turnaround_days} working day${c.turnaround_days === 1 ? "" : "s"}` : null],
  ].filter(([, v]) => v) as [string, string][];
  const section = (title: string, text: string | null) => text && (
    <section className="mt-5"><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 whitespace-pre-line text-slate-700">{text}</p></section>
  );
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Article", headline: c.title,
        description: clip(c.fault), image: c.photos.length ? c.photos : undefined,
        datePublished: c.published_at ?? c.created_at, dateModified: c.updated_at,
        author: { "@type": "Organization", name: "PCBDukaan", url: SITE },
        publisher: { "@type": "Organization", name: "PCBDukaan", logo: { "@type": "ImageObject", url: `${SITE}/logo-512.png` } },
        mainEntityOfPage: `${SITE}/repair-case-studies/${c.slug}`,
      }} />
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: t("nav.caseStudies"), href: "/repair-case-studies" }, { label: c.title }]} />
      <p className="text-xs font-semibold uppercase text-accent-700">Repair case study{c.published_at ? ` · ${formatDate(c.published_at)}` : ""}</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{c.title}</h1>
      {facts.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-1 rounded-md bg-white p-4 text-sm ring-1 ring-slate-200 sm:grid-cols-2">
          {facts.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-slate-500">{k}:</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
      )}
      {c.photos.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {c.photos.map((p, i) => (
            <a key={p} href={p} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`${c.title} – photo ${i + 1}`} loading={i ? "lazy" : "eager"} className="aspect-square w-full rounded object-cover ring-1 ring-slate-200" />
            </a>
          ))}
        </div>
      )}
      {section("The fault", c.fault)}
      {section("What we found", c.diagnosis)}
      {section("What we repaired", c.repair)}
      {section("Result", c.result)}
      {c.saving_note && <p className="mt-5 rounded-md bg-emerald-50 p-4 font-semibold text-emerald-900 ring-1 ring-emerald-200">💰 {c.saving_note}</p>}
      <div className="mt-8 rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-5 text-white">
        <p className="font-bold">Same problem with your board?</p>
        <p className="mt-1 text-sm text-brand-100">Send photos for a free repair quote – no work without your approval.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/pcb-repair#repair-form" className="rounded-md bg-accent-500 px-4 py-2 text-sm font-bold text-white hover:bg-accent-600">{t("loc.getQuote")}</Link>
          {service && <Link href={`/pcb-repair/${service.slug}`} className="rounded-md px-4 py-2 text-sm font-semibold ring-1 ring-white/40 hover:bg-white/10">{service.name}</Link>}
        </div>
      </div>
      <p className="mt-6 text-sm"><Link href="/repair-case-studies" className="font-semibold text-brand-700 hover:underline">← All case studies</Link></p>
    </>
  );
}
