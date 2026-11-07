import { Suspense } from "react";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { lang } from "next/root-params";
import { getT } from "@/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import { CategoryLinks, Faq, RepairCta } from "@/components/LocationBlocks";
import { INDUSTRY_LABEL, STATES, areasIn, getState, listText, needsFor, stateIndustries } from "@/lib/locations";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
const ALL_CATEGORIES = ["industrial-control-boards", "smps-power-supplies", "vfd-motor-drives", "plc-io-modules", "load-cells-weighing", "industrial-sensors"];

// English pages are built ahead; other languages are built on first visit (content is English).
export async function generateStaticParams() {
  const all = STATES.map((s) => ({ state: s.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/locations/[state]">) {
  const { state } = await props.params;
  const s = getState(state);
  if (!s) return { title: "Not found" };
  const n = areasIn(s.slug).length;
  return {
    title: `PCB repair & electronics in ${s.name}`,
    description: `Industrial PCB repair and SMPS, VFD, PLC, load cell and sensor supply for factories in ${s.name}${n ? ` — ${n} industrial areas` : ""}. Free repair quotes.`,
    alternates: { canonical: `/locations/${s.slug}` },
  };
}

export default function StatePage(props: PageProps<"/[lang]/locations/[state]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <StateContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function StateContent({ params }: Pick<PageProps<"/[lang]/locations/[state]">, "params">) {
  const { state } = await params;
  const s = getState(state);
  if (!s) notFound();
  const areas = areasIn(s.slug);
  const industries = stateIndustries(s.slug).slice(0, 5);
  const needs = industries.length ? needsFor(industries.slice(0, 3)) : { boards: ["control boards", "SMPS units", "VFD drive boards", "PLC cards"], categories: ALL_CATEGORIES };
  const categories = await getCategories();
  const industryText = listText(industries.map((i) => INDUSTRY_LABEL[i]));

  const faqs = [
    { q: `Do you deliver to ${s.name}?`, a: `Yes. Orders to ${s.name} are dispatched within 24 hours on working days (for in-stock items) and usually arrive in 2–7 working days by courier, depending on the PIN code. Shipping is free above ₹499 and cash on delivery is available.` },
    { q: `Can you repair industrial PCBs from ${s.name}?`, a: `Yes. Upload photos of the board on our PCB repair page. We send a free quote, usually within 1–2 working days. Once you approve, courier the board to us; we repair it at component level, test it and ship it back.` },
    { q: "Which boards do you repair?", a: `Commonly ${listText(needs.boards.slice(0, 4))}, plus inverter/UPS cards, SMPS, PLC, HMI, weighing indicators and machine control boards.` },
    { q: "Are prices inclusive of GST?", a: "Prices are shown excluding GST; 18% GST is added at checkout and shown on your order." },
  ];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Areas we serve", item: `${SITE}/locations` },
          { "@type": "ListItem", position: 3, name: s.name, item: `${SITE}/locations/${s.slug}` },
        ],
      }} />
      <Breadcrumbs items={[{ label: (await getT()).t("nav.areas"), href: "/locations" }, { label: s.name }]} />
      <section className="rounded-md bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white sm:p-8">
        <h1 className="text-3xl font-extrabold">Industrial PCB repair &amp; electronics in {s.name}</h1>
        <p className="mt-3 max-w-3xl text-brand-100">
          {areas.length
            ? `${s.name} has major ${industryText} clusters across ${areas.length} industrial areas. PCBDukaan supplies ${listText(needs.boards.slice(0, 4))} for these plants and repairs faulty industrial boards by courier.`
            : `PCBDukaan supplies industrial control boards, SMPS, drive boards, PLC modules and weighing electronics to factories and workshops in ${s.name}, and repairs faulty industrial boards by courier.`}
        </p>
      </section>

      {areas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Industrial areas in {s.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((x) => (
              <Link key={x.slug} href={`/locations/${s.slug}/${x.slug}`} className="rounded-md bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
                <span className="block font-semibold text-brand-700">{x.name}</span>
                <span className="block text-xs text-slate-500">{x.city}</span>
                <span className="mt-1 block text-sm text-slate-700">{listText(x.industries.map((i) => INDUSTRY_LABEL[i]))}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Popular for {s.name} factories</h2>
        <CategoryLinks slugs={needs.categories} categories={categories} />
      </section>

      <div className="mt-8"><RepairCta place={s.name} /></div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Frequently asked questions</h2>
        <Faq items={faqs} />
      </section>
    </>
  );
}
