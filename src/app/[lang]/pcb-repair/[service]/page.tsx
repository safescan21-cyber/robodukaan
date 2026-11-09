import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getT } from "@/i18n/server";
import { REPAIR_SERVICES, getRepairService } from "@/lib/seo-content";
import { DRIVE_BRANDS } from "@/lib/fault-codes";
import { guidesForService } from "@/lib/repair-guides";
import { STATES } from "@/lib/locations";
import { RepairPrices, RepairPromise } from "@/components/RepairPromise";
import { getCaseStudies } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// English pages are built ahead; other languages on first visit (content is English).
export async function generateStaticParams() {
  const all = REPAIR_SERVICES.map((s) => ({ service: s.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/pcb-repair/[service]">): Promise<Metadata> {
  const { service } = await props.params;
  const s = getRepairService(service);
  if (!s) return { title: "Not found" };
  return { title: s.title, description: s.description, alternates: { canonical: `/pcb-repair/${s.slug}` } };
}

export default function RepairServicePage(props: PageProps<"/[lang]/pcb-repair/[service]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <Service params={props.params} />
      </Suspense>
    </div>
  );
}

async function Service({ params }: Pick<PageProps<"/[lang]/pcb-repair/[service]">, "params">) {
  const { service } = await params;
  const s = getRepairService(service);
  if (!s) notFound();
  const { t } = await getT();
  const faultBrands = DRIVE_BRANDS.filter((b) => s.faultCodes?.includes(b.slug));
  const cases = (await getCaseStudies(s.slug)).slice(0, 4);
  const others = REPAIR_SERVICES.filter((x) => x.slug !== s.slug);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: s.name,
        serviceType: s.name,
        description: s.description,
        url: `${SITE}/pcb-repair/${s.slug}`,
        provider: { "@type": "Organization", name: "PCBDukaan", url: SITE },
        areaServed: { "@type": "Country", name: "India" },
        ...(s.prices?.length ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: Math.min(...s.prices.map((p) => p.from)),
            ...(s.prices.every((p) => p.to) ? { highPrice: Math.max(...s.prices.map((p) => p.to!)) } : {}),
          },
        } : {}),
      }} />
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: s.name }]} />

      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{s.title}</h1>
        <p className="mt-3 max-w-3xl text-brand-100">{s.intro}</p>
        <Link href="/pcb-repair#repair-form" className="mt-5 inline-block rounded-md bg-accent-500 px-5 py-2.5 font-bold text-white hover:bg-accent-600">{t("loc.getQuote")}</Link>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Faults we repair</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">{s.faults.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Brands we see most</h2>
          <p className="mt-2 text-sm text-slate-700">{s.brands.join(" · ")}</p>
          <h2 className="mt-4 text-lg font-bold">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-slate-700">
            <li>{t("repairPage.s1t")}</li>
            <li>{t("repairPage.s2t")}</li>
            <li>{t("repairPage.s3t")}</li>
            <li>{t("repairPage.s4t")}</li>
          </ol>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {s.prices?.length ? <RepairPrices service={s} /> : null}
        <RepairPromise className={s.prices?.length ? "" : "md:col-span-2"} />
      </div>

      {guidesForService(s.slug).length > 0 && (
        <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Check it yourself first</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {guidesForService(s.slug).map((g) => <li key={g.slug}>📘 <Link href={`/repair-guides/${g.slug}`} className="text-brand-700 hover:underline">{g.title}</Link></li>)}
          </ul>
        </section>
      )}

      {cases.length > 0 && (
        <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Recent {s.name.toLowerCase()} jobs</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {cases.map((c) => <li key={c.id}><Link href={`/repair-case-studies/${c.slug}`} className="text-brand-700 hover:underline">{c.title}</Link></li>)}
          </ul>
        </section>
      )}

      {faultBrands.length > 0 && (
        <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">Check the fault code first</h2>
          <p className="mt-1 text-sm text-slate-600">What the error on the display means and what to check before sending the board:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {faultBrands.map((b) => <Link key={b.slug} href={`/fault-codes/${b.slug}`} className="rounded-full bg-slate-50 px-3 py-1 text-sm ring-1 ring-slate-300 hover:ring-brand-600">{b.brand} fault codes</Link>)}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">{t("product.faqs")}</h2>
        <dl className="mt-2 space-y-3">
          {s.faqs.map((f) => (
            <div key={f.q}><dt className="font-semibold">{f.q}</dt><dd className="mt-0.5 text-sm text-slate-700">{f.a}</dd></div>
          ))}
        </dl>
        {s.category && (
          <p className="mt-4 text-sm">⚡ Need it running today? <Link href={`/category/${s.category}`} className="font-semibold text-brand-700 hover:underline">{t("repair.replaceLink")}</Link></p>
        )}
      </section>

      <section className="mt-6 text-sm">
        <h2 className="font-bold">Other repair services</h2>
        <p className="mt-1">{others.map((o, i) => <span key={o.slug}>{i ? " · " : ""}<Link href={`/pcb-repair/${o.slug}`} className="text-brand-700 hover:underline">{o.name}</Link></span>)}</p>
        <h2 className="mt-4 font-bold">{t("repairPage.everyState")}</h2>
        <p className="mt-1 text-slate-600">{STATES.slice(0, 12).map((st, i) => <span key={st.slug}>{i ? " · " : ""}<Link href={`/locations/${st.slug}`} className="hover:text-brand-700 hover:underline">{st.name}</Link></span>)} · <Link href="/locations" className="font-semibold text-brand-700 hover:underline">{t("common.viewAll")}</Link></p>
      </section>
    </>
  );
}
