import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getT } from "@/i18n/server";
import { getRepairService } from "@/lib/seo-content";
import { DRIVE_BRANDS, codeSlug } from "@/lib/fault-codes";
import { REPAIR_BRANDS, brandsForService, getRepairBrand } from "@/lib/repair-brands";
import { RepairPrices, RepairPromise, priceText } from "@/components/RepairPromise";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export async function generateStaticParams() {
  const all = REPAIR_BRANDS.map((b) => ({ service: b.service, brand: b.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

const fit = (options: string[], max: number) => options.find((o) => o.length <= max) ?? options[options.length - 1];

export async function generateMetadata(props: PageProps<"/[lang]/pcb-repair/[service]/[brand]">): Promise<Metadata> {
  const { service, brand } = await props.params;
  const b = getRepairBrand(service, brand);
  if (!b) return { title: "Not found" };
  return {
    title: fit([`${b.brand} ${b.noun} repair in India – board level`, `${b.brand} ${b.noun} repair in India`, `${b.brand} ${b.noun} repair`], 48),
    description: `${b.brand} ${b.noun} repair at component level – ${b.series}. Free photo quote, no work without your approval, tested before return. Courier from anywhere in India.`.slice(0, 158),
    alternates: { canonical: `/pcb-repair/${b.service}/${b.slug}` },
  };
}

export default function BrandRepairPage(props: PageProps<"/[lang]/pcb-repair/[service]/[brand]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <BrandRepair params={props.params} />
      </Suspense>
    </div>
  );
}

async function BrandRepair({ params }: Pick<PageProps<"/[lang]/pcb-repair/[service]/[brand]">, "params">) {
  const { service, brand } = await params;
  const b = getRepairBrand(service, brand);
  const s = b && getRepairService(b.service);
  if (!b || !s) notFound();
  const { t } = await getT();
  const fb = b.faultBrand ? DRIVE_BRANDS.find((x) => x.slug === b.faultBrand) : undefined;
  const boardCodes = fb ? fb.codes.filter((c) => c.board).slice(0, 10) : [];
  const others = brandsForService(b.service).filter((x) => x.slug !== b.slug);
  const url = `${SITE}/pcb-repair/${b.service}/${b.slug}`;
  const priceLine = s.prices?.length ? s.prices.map((p) => `${p.item}: ${priceText(p, t)}`).join("; ") : "";
  const faqs = [
    { q: `Do you repair ${b.brand} ${b.noun}s?`, a: `Yes – we repair ${b.brand} ${b.noun}s at component level, including ${b.series}. Send photos of the unit and its rating label for a free quote.` },
    ...(priceLine ? [{ q: `How much does ${b.brand} ${b.noun} repair cost?`, a: `Typical prices (+ GST): ${priceLine}. The exact price comes in the free quote after the photo check.` }] : []),
    { q: `Can I send my ${b.brand} ${b.noun} from another city?`, a: "Yes. After you approve the quote, courier the unit to us from anywhere in India; we repair, test and courier it back." },
    ...s.faqs.filter((f) => !f.q.startsWith("How does the repair work")).slice(0, 2),
  ];
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "Service", name: `${b.brand} ${b.noun} repair`, serviceType: s.name, url,
          description: `${b.brand} ${b.noun} repair – ${b.series}`,
          provider: { "@type": "Organization", name: "PCBDukaan", url: SITE }, areaServed: { "@type": "Country", name: "India" },
        },
        {
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "PCB repair", item: `${SITE}/pcb-repair` },
            { "@type": "ListItem", position: 2, name: s.name, item: `${SITE}/pcb-repair/${s.slug}` },
            { "@type": "ListItem", position: 3, name: `${b.brand} ${b.noun} repair`, item: url },
          ],
        },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ]} />
      <Breadcrumbs schema={false} items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: s.name, href: `/pcb-repair/${s.slug}` }, { label: b.brand }]} />

      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{b.brand} {b.noun} repair</h1>
        <p className="mt-1 text-sm text-brand-200">{b.series}</p>
        <p className="mt-3 max-w-3xl text-brand-100">
          Is your {b.brand} {b.noun} dead, tripping or showing an error? We repair it at component level – no need to buy a new unit or change your machine&apos;s wiring and settings.
          Send photos for a free quote; nothing is repaired without your approval, and every unit is tested before it goes back to you.
        </p>
        <Link href="/pcb-repair#repair-form" className="mt-5 inline-block rounded-md bg-accent-500 px-5 py-2.5 font-bold text-white hover:bg-accent-600">{t("loc.getQuote")}</Link>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">{b.brand} {b.noun} faults we repair</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">{s.faults.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
        <RepairPromise />
      </div>

      {boardCodes.length > 0 && fb && (
        <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">{b.brand} error codes that usually need board repair</h2>
          <p className="mt-1 text-sm text-slate-600">If one of these keeps coming back after the basic checks, the fault is usually on the power or control board:</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {boardCodes.map((c) => (
              <li key={c.code}><Link href={`/fault-codes/${fb.slug}/${codeSlug(c)}`} className="text-brand-700 hover:underline"><span className="font-mono">{c.code}</span> – {c.name}</Link></li>
            ))}
          </ul>
          <p className="mt-3 text-sm"><Link href={`/fault-codes/${fb.slug}`} className="font-semibold text-brand-700 hover:underline">All {fb.brand} error codes →</Link></p>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {s.prices?.length ? <RepairPrices service={s} /> : null}
        <section className={`rounded-md bg-white p-5 ring-1 ring-slate-200 ${s.prices?.length ? "" : "md:col-span-2"}`}>
          <h2 className="text-lg font-bold">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-slate-700">
            <li>{t("repairPage.s1t")}</li>
            <li>{t("repairPage.s2t")}</li>
            <li>{t("repairPage.s3t")}</li>
            <li>{t("repairPage.s4t")}</li>
          </ol>
          <p className="mt-3 text-sm text-slate-600">Tip: include a photo of the rating label (model and serial number) and of both sides of the board.</p>
        </section>
      </div>

      <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">{t("product.faqs")}</h2>
        <dl className="mt-2 space-y-3">
          {faqs.map((f) => <div key={f.q}><dt className="font-semibold">{f.q}</dt><dd className="mt-0.5 text-sm text-slate-700">{f.a}</dd></div>)}
        </dl>
        {s.category && <p className="mt-4 text-sm">⚡ Need it running today? <Link href={`/category/${s.category}`} className="font-semibold text-brand-700 hover:underline">{t("repair.replaceLink")}</Link></p>}
      </section>

      <section className="mt-6 text-sm">
        <h2 className="font-bold">Other brands we repair</h2>
        <p className="mt-1">{others.map((o, i) => <span key={o.slug}>{i ? " · " : ""}<Link href={`/pcb-repair/${o.service}/${o.slug}`} className="text-brand-700 hover:underline">{o.brand} {o.noun} repair</Link></span>)}</p>
        <p className="mt-3"><Link href={`/pcb-repair/${s.slug}`} className="font-semibold text-brand-700 hover:underline">All about {s.name.toLowerCase()} →</Link></p>
      </section>
    </>
  );
}
