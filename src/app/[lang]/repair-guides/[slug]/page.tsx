import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { REPAIR_GUIDES, SAFETY_NOTE, getRepairGuide } from "@/lib/repair-guides";
import { getRepairService } from "@/lib/seo-content";
import { getT } from "@/i18n/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// English pages are built ahead; other languages on first visit (content is English).
export async function generateStaticParams() {
  const all = REPAIR_GUIDES.map((g) => ({ slug: g.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/repair-guides/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const g = getRepairGuide(slug);
  if (!g) return { title: "Not found" };
  return { title: g.title, description: g.description, alternates: { canonical: `/repair-guides/${g.slug}` } };
}

export default function GuidePage(props: PageProps<"/[lang]/repair-guides/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Guide params={props.params} /></Suspense>
    </div>
  );
}

async function Guide({ params }: Pick<PageProps<"/[lang]/repair-guides/[slug]">, "params">) {
  const { slug } = await params;
  const g = getRepairGuide(slug);
  if (!g) notFound();
  const { t } = await getT();
  const service = g.service ? getRepairService(g.service) : undefined;
  const others = REPAIR_GUIDES.filter((x) => x.slug !== g.slug).slice(0, 5);
  const list = (items: string[]) => <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">{items.map((s) => <li key={s}>{s}</li>)}</ul>;
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "HowTo", name: g.title, description: g.description,
          totalTime: `PT${g.minutes}M`,
          tool: g.tools?.map((name) => ({ "@type": "HowToTool", name })),
          step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text, url: `${SITE}/repair-guides/${g.slug}#step-${i + 1}` })),
        },
        {
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: g.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ]} />
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: t("nav.repairGuides"), href: "/repair-guides" }, { label: g.title }]} />
      <p className="text-xs font-semibold uppercase text-accent-700">Repair guide · {g.board} · {g.minutes} min</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{g.title}</h1>
      <p className="mt-3 text-slate-700">{g.intro}</p>
      <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {SAFETY_NOTE}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200"><h2 className="font-bold">Symptoms</h2>{list(g.symptoms)}</section>
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200"><h2 className="font-bold">Common causes</h2>{list(g.causes)}</section>
      </div>
      {g.tools && <p className="mt-4 text-sm text-slate-600"><b>You need:</b> {g.tools.join(" · ")}</p>}

      <section className="mt-6">
        <h2 className="text-xl font-bold">Step-by-step checks</h2>
        <ol className="mt-3 space-y-4">
          {g.steps.map((s, i) => (
            <li key={s.title} id={`step-${i + 1}`} className="flex gap-3 scroll-mt-24">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <div><h3 className="font-semibold">{s.title}</h3><p className="mt-0.5 text-slate-700">{s.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-5 text-white">
        <h2 className="text-lg font-bold">When to send it for repair</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-brand-100">{g.sendForRepair.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pcb-repair#repair-form" className="rounded-md bg-accent-500 px-4 py-2 text-sm font-bold text-white hover:bg-accent-600">{t("loc.getQuote")}</Link>
          {service && <Link href={`/pcb-repair/${service.slug}`} className="rounded-md px-4 py-2 text-sm font-semibold ring-1 ring-white/40 hover:bg-white/10">{service.name}</Link>}
          {g.category && <Link href={`/category/${g.category}`} className="rounded-md px-4 py-2 text-sm font-semibold ring-1 ring-white/40 hover:bg-white/10">{t("repair.replaceLink")}</Link>}
        </div>
      </section>

      <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">{t("product.faqs")}</h2>
        <dl className="mt-2 space-y-3">{g.faqs.map((f) => <div key={f.q}><dt className="font-semibold">{f.q}</dt><dd className="mt-0.5 text-sm text-slate-700">{f.a}</dd></div>)}</dl>
        {g.faultCodes !== undefined && <p className="mt-4 text-sm">⚠️ <Link href="/fault-codes" className="font-semibold text-brand-700 hover:underline">{t("nav.faultCodes")}</Link></p>}
      </section>

      <section className="mt-6 text-sm">
        <h2 className="font-bold">More repair guides</h2>
        <ul className="mt-2 space-y-1">{others.map((o) => <li key={o.slug}><Link href={`/repair-guides/${o.slug}`} className="text-brand-700 hover:underline">{o.title}</Link></li>)}</ul>
        <p className="mt-2"><Link href="/repair-guides" className="font-semibold text-brand-700 hover:underline">{t("common.viewAll")} →</Link></p>
      </section>
    </>
  );
}
