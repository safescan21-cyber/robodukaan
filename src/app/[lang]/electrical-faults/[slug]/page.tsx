import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ExpertBox } from "@/components/ExpertBox";
import { ELECTRICAL_FAULTS, ELECTRICAL_SAFETY, getElectricalFault } from "@/lib/electrical-faults";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export async function generateStaticParams() {
  const all = ELECTRICAL_FAULTS.map((f) => ({ slug: f.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/electrical-faults/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const f = getElectricalFault(slug);
  if (!f) return { title: "Not found" };
  return { title: f.title, description: f.description, alternates: { canonical: `/electrical-faults/${f.slug}` } };
}

export default function ElectricalFaultPage(props: PageProps<"/[lang]/electrical-faults/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Fault params={props.params} /></Suspense>
    </div>
  );
}

async function Fault({ params }: Pick<PageProps<"/[lang]/electrical-faults/[slug]">, "params">) {
  const { slug } = await params;
  const f = getElectricalFault(slug);
  if (!f) notFound();
  const others = ELECTRICAL_FAULTS.filter((x) => x.slug !== f.slug && x.group === f.group).slice(0, 4);
  const list = (items: string[], ordered = false) => {
    const cls = `mt-2 space-y-1 ps-5 text-slate-700 ${ordered ? "list-decimal" : "list-disc"}`;
    return ordered ? <ol className={cls}>{items.map((s) => <li key={s}>{s}</li>)}</ol> : <ul className={cls}>{items.map((s) => <li key={s}>{s}</li>)}</ul>;
  };
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "HowTo", name: f.h1, description: f.description, url: `${SITE}/electrical-faults/${f.slug}`,
          step: f.checks.map((c, i) => ({ "@type": "HowToStep", position: i + 1, text: c })),
        },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: f.faqs.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })) },
      ]} />
      <Breadcrumbs items={[{ label: "Electrical faults", href: "/electrical-faults" }, { label: f.h1 }]} />
      <p className="text-xs font-semibold uppercase text-accent-700">Electrical fault · {f.group}</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{f.h1}</h1>
      <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">⚠️ {ELECTRICAL_SAFETY}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200"><h2 className="font-bold">What you see</h2>{list(f.symptoms)}</section>
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200"><h2 className="font-bold">Common causes</h2>{list(f.causes)}</section>
      </div>
      <section className="mt-4 rounded-md bg-white p-5 ring-1 ring-slate-200"><h2 className="text-lg font-bold">What to check, step by step</h2>{list(f.checks, true)}</section>
      <section className="mt-4 rounded-md bg-emerald-50 p-5 ring-1 ring-emerald-200"><h2 className="font-bold text-emerald-900">How to prevent it</h2>{list(f.prevent)}</section>

      <ExpertBox path={`/electrical-faults/${f.slug}`} className="mt-6" />

      <section className="mt-6">
        <h2 className="text-lg font-bold">Questions</h2>
        <dl className="mt-2 space-y-3">{f.faqs.map((q) => <div key={q.q}><dt className="font-semibold">{q.q}</dt><dd className="text-slate-700">{q.a}</dd></div>)}</dl>
      </section>

      <section className="mt-6 text-sm">
        {f.related?.length ? <p>Related: {f.related.map((r, i) => <span key={r.href}>{i ? " · " : ""}<Link href={r.href} className="text-brand-700 hover:underline">{r.label}</Link></span>)}</p> : null}
        {others.length ? <p className="mt-2">More {f.group.toLowerCase()} faults: {others.map((o, i) => <span key={o.slug}>{i ? " · " : ""}<Link href={`/electrical-faults/${o.slug}`} className="text-brand-700 hover:underline">{o.h1}</Link></span>)}</p> : null}
        <p className="mt-2"><Link href="/electrical-faults" className="font-semibold text-brand-700 hover:underline">All electrical faults →</Link> · <Link href="/fault-codes" className="text-brand-700 hover:underline">VFD, servo & PLC error codes</Link> · <Link href="/pcb-repair" className="text-brand-700 hover:underline">Board repair</Link></p>
      </section>
    </>
  );
}
