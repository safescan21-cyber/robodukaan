import { Suspense } from "react";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { lang } from "next/root-params";
import { getT } from "@/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import { CategoryLinks, Faq, RepairCta } from "@/components/LocationBlocks";
import { AREAS, INDUSTRY_LABEL, areasIn, getArea, getState, listText, needsFor } from "@/lib/locations";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// English pages are built ahead; other languages are built on first visit (content is English).
export async function generateStaticParams() {
  const all = AREAS.map((x) => ({ state: x.state, area: x.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/locations/[state]/[area]">) {
  const { state, area } = await props.params;
  const x = getArea(state, area);
  const s = getState(state);
  if (!x || !s) return { title: "Not found" };
  return {
    title: `PCB repair & industrial electronics in ${x.name}, ${x.city}`,
    description: `Industrial PCB repair and supply for ${listText(x.industries.map((i) => INDUSTRY_LABEL[i]))} units in ${x.name}, ${x.city} (${s.name}). SMPS, drive boards, PLC modules, sensors. Free repair quote.`,
    alternates: { canonical: `/locations/${s.slug}/${x.slug}` },
  };
}

export default function AreaPage(props: PageProps<"/[lang]/locations/[state]/[area]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <AreaContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function AreaContent({ params }: Pick<PageProps<"/[lang]/locations/[state]/[area]">, "params">) {
  const { state, area } = await params;
  const x = getArea(state, area);
  const s = getState(state);
  if (!x || !s) notFound();
  const categories = await getCategories();
  const needs = needsFor(x.industries);
  const industryText = listText(x.industries.map((i) => INDUSTRY_LABEL[i]));
  const nearby = areasIn(s.slug).filter((o) => o.slug !== x.slug);
  const sameCity = nearby.filter((o) => o.city === x.city);

  const faqs = [
    { q: `Do you deliver to ${x.name}?`, a: `Yes. We ship to ${x.name} in ${x.city} by courier. In-stock items are dispatched within 24 hours on working days and usually arrive in 2–7 working days. Free shipping above ₹499; cash on delivery available.` },
    { q: `Which boards do factories in ${x.name} send us?`, a: `Mostly ${listText(needs.boards.slice(0, 4))} — typical of the ${industryText} units in the area — as well as inverter/UPS cards, SMPS and HMI panels.` },
    { q: "How does PCB repair work?", a: "Upload photos of the faulty board and describe the problem. We email a free quote, usually within 1–2 working days. After you approve, courier the board to us; we repair it at component level, test it and ship it back with a repair warranty." },
    { q: "Can I order replacement parts?", a: "Yes — SMPS units, IGBT and MOSFET power components, relays, sensors, PLC I/O modules and more are available online. Log in to order; prices exclude 18% GST, which is added at checkout." },
  ];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Areas we serve", item: `${SITE}/locations` },
          { "@type": "ListItem", position: 3, name: s.name, item: `${SITE}/locations/${s.slug}` },
          { "@type": "ListItem", position: 4, name: x.name, item: `${SITE}/locations/${s.slug}/${x.slug}` },
        ],
      }} />
      <Breadcrumbs items={[{ label: (await getT()).t("nav.areas"), href: "/locations" }, { label: s.name, href: `/locations/${s.slug}` }, { label: x.name }]} />
      <section className="rounded-md bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{x.city}, {s.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold">PCB repair &amp; industrial electronics in {x.name}</h1>
        <p className="mt-3 max-w-3xl text-brand-100">
          {x.name} in {x.city} is known for its {industryText} units. PCBDukaan supplies replacement electronics for these plants — such as {listText(needs.boards.slice(0, 3))} — and repairs faulty industrial PCBs at component level by courier.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-bold">What we supply to {x.name}</h2>
            <CategoryLinks slugs={needs.categories} categories={categories} />
          </section>
          <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-bold">Boards we repair for {x.name} factories</h2>
            <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {[...needs.boards.slice(0, 6), "Inverter & UPS control cards", "SMPS & power supply boards"].filter((v, i, arr) => arr.indexOf(v) === i).map((b) => (
                <li key={b} className="flex gap-2"><span className="text-emerald-600">✓</span><span className="first-letter:uppercase">{b}</span></li>
              ))}
            </ul>
          </section>
          <RepairCta place={x.name} />
          <section>
            <h2 className="mb-3 text-xl font-bold">Frequently asked questions</h2>
            <Faq items={faqs} />
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-md bg-white p-5 text-sm ring-1 ring-slate-200">
            <h2 className="mb-2 font-bold">Industries in {x.name}</h2>
            <ul className="space-y-1 text-slate-700">{x.industries.map((i) => <li key={i} className="first-letter:uppercase">• {INDUSTRY_LABEL[i]}</li>)}</ul>
          </section>
          {nearby.length > 0 && (
            <section className="rounded-md bg-white p-5 text-sm ring-1 ring-slate-200">
              <h2 className="mb-2 font-bold">{sameCity.length ? `More industrial areas in ${x.city} & ${s.name}` : `More industrial areas in ${s.name}`}</h2>
              <ul className="space-y-1.5">
                {[...sameCity, ...nearby.filter((o) => o.city !== x.city)].slice(0, 10).map((o) => (
                  <li key={o.slug}><Link href={`/locations/${s.slug}/${o.slug}`} className="text-brand-700 hover:underline">{o.name}</Link> <span className="text-slate-500">· {o.city}</span></li>
                ))}
              </ul>
              <Link href={`/locations/${s.slug}`} className="mt-3 inline-block font-semibold text-brand-700 hover:underline">All of {s.name} →</Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
