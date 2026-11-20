import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { RepairCta } from "@/components/LocationBlocks";
import { getT } from "@/i18n/server";
import { DRIVE_BRANDS, codeSlug, getFaultCode, kindLabel } from "@/lib/fault-codes";
import { repairBrandForFaultBrand } from "@/lib/repair-brands";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// One page per error code, so a search for e.g. "AL-014 earth fault" or "Delta ocA" lands on the exact answer.
// (Returns brand + code pairs itself, so it never depends on the parent's list.)
export async function generateStaticParams() {
  const all = DRIVE_BRANDS.flatMap((b) => b.codes.map((c) => ({ brand: b.slug, code: codeSlug(c) })));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

const fit = (options: string[], max: number) => options.find((o) => o.length <= max) ?? options[options.length - 1];

export async function generateMetadata(props: PageProps<"/[lang]/fault-codes/[brand]/[code]">): Promise<Metadata> {
  const { brand, code } = await props.params;
  const f = getFaultCode(brand, code);
  if (!f) return { title: "Not found" };
  const { brand: b, code: c } = f;
  const first = c.code.split(" / ")[0];
  const word = b.kind === "servo" ? "alarm" : "error";
  // ≤ 48 characters + " | PCBDukaan" so Google shows the whole title.
  const title = fit([
    `${b.brand} ${first} ${word}: ${c.name} – fix`,
    `${b.brand} ${first}: ${c.name}`,
    `${b.brand} ${first} ${word} – meaning & fix`,
    `${first}: ${c.name}`,
    `${b.brand} ${first} ${word}`,
  ], 48);
  const also = c.aliases?.length ? ` (also ${c.aliases.slice(0, 3).join(", ")})` : "";
  return {
    title,
    description: `${b.brand} ${kindLabel(b)} ${word} ${c.code}${also}: ${c.name}. Causes: ${c.causes.slice(0, 2).join("; ")}. What to check and how to fix it.`.slice(0, 158),
    alternates: { canonical: `/fault-codes/${b.slug}/${codeSlug(c)}` },
  };
}

export default function FaultCodePage(props: PageProps<"/[lang]/fault-codes/[brand]/[code]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <FaultCode params={props.params} />
      </Suspense>
    </div>
  );
}

async function FaultCode({ params }: Pick<PageProps<"/[lang]/fault-codes/[brand]/[code]">, "params">) {
  const { brand, code } = await params;
  const f = getFaultCode(brand, code);
  if (!f) notFound();
  const { brand: b, code: c } = f;
  const { t } = await getT();
  const url = `${SITE}/fault-codes/${b.slug}/${codeSlug(c)}`;
  const word = b.kind === "servo" ? "alarm" : "error";
  const idx = b.codes.indexOf(c);
  const related = [...b.codes.slice(idx + 1), ...b.codes.slice(0, idx)].slice(0, 8);
  // Same problem on other brands (by the first important word of the name, e.g. "overcurrent", "earth").
  const key = /earth|ground|overcurrent|overvoltage|undervoltage|overheat|overload|encoder|phase loss|eeprom|memory/i.exec(c.name)?.[0].toLowerCase();
  const sameOther = key
    ? DRIVE_BRANDS.filter((x) => x.slug !== b.slug).flatMap((x) => x.codes.filter((y) => {
        const n = y.name.toLowerCase();
        return key === "earth" || key === "ground" ? /earth|ground/.test(n) : n.includes(key);
      }).slice(0, 1).map((y) => ({ x, y }))).slice(0, 8)
    : [];
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Fault codes", item: `${SITE}/fault-codes` },
          { "@type": "ListItem", position: 3, name: `${b.brand} fault codes`, item: `${SITE}/fault-codes/${b.slug}` },
          { "@type": "ListItem", position: 4, name: c.code, item: url },
        ],
      }} />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: `What does ${b.brand} ${word} ${c.code} mean?`,
            acceptedAnswer: { "@type": "Answer", text: `${c.code} on a ${b.brand} ${kindLabel(b)} means: ${c.name}.` } },
          { "@type": "Question", name: `What causes ${b.brand} ${c.code}?`,
            acceptedAnswer: { "@type": "Answer", text: c.causes.join(". ") + "." } },
          { "@type": "Question", name: `How to fix ${b.brand} ${c.code}?`,
            acceptedAnswer: { "@type": "Answer", text: c.check.join(". ") + "." } },
        ],
      }} />
      <Breadcrumbs schema={false} items={[{ label: t("nav.faultCodes"), href: "/fault-codes" }, { label: b.brand, href: `/fault-codes/${b.slug}` }, { label: c.code }]} />
      <h1 className="text-3xl font-extrabold">
        <span className="me-2 rounded bg-slate-900 px-2 py-0.5 font-mono text-2xl text-white">{c.code}</span>
        {c.name}
      </h1>
      <p className="mt-2 text-slate-700">
        {b.brand} {kindLabel(b)} {word} · {b.series}
        {c.aliases?.length ? <> · <span className="text-slate-500">also shown or searched as {c.aliases.join(", ")}</span></> : null}
      </p>

      <section className="mt-6 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">What {c.code} means</h2>
        <p className="mt-2 text-slate-700">
          When a {b.brand} {kindLabel(b)} shows <strong className="font-mono">{c.code}</strong>, it has stopped to protect itself: <strong>{c.name.toLowerCase()}</strong>.
          {" "}Write down when it appears (at start, while accelerating, while stopping, or at random) – that tells you most about the cause.
        </p>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">{t("fault.causes")}</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">{c.causes.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">{t("fault.check")}</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-slate-700">{c.check.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
      </div>

      {c.board ? (
        <p className="mt-4 rounded bg-brand-50 px-4 py-3 text-brand-900">
          🔧 If {c.code} comes back after these checks, the fault is usually on the drive&apos;s power or control board. {t("fault.repairCta")}{" "}
          <Link href="/pcb-repair" className="font-semibold underline">{t("loc.getQuote")}</Link>
          {(() => { const rb = repairBrandForFaultBrand(b.slug); return rb ? <> · <Link href={`/pcb-repair/${rb.service}/${rb.slug}`} className="underline">{rb.brand} {rb.noun} repair</Link></> : null; })()}
        </p>
      ) : null}
      {c.board ? <p className="mt-3 text-sm">🧩 Repairing it yourself? <Link href="/category/semiconductors" className="font-semibold text-brand-700 hover:underline">IGBTs, MOSFETs, diodes &amp; driver ICs</Link></p> : null}
      <p className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {t("fault.note")}</p>

      {sameOther.length ? (
        <section className="mt-6">
          <h2 className="text-lg font-bold">Same fault on other brands</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {sameOther.map(({ x, y }) => (
              <li key={x.slug}><Link href={`/fault-codes/${x.slug}/${codeSlug(y)}`} className="inline-block rounded-full bg-white px-3 py-1 ring-1 ring-slate-300 hover:ring-brand-600">{x.brand} <span className="font-mono">{y.code.split(" / ")[0]}</span></Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-bold">Other {b.brand} codes</h2>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {related.map((r) => (
            <li key={r.code}><Link href={`/fault-codes/${b.slug}/${codeSlug(r)}`} className="text-brand-700 hover:underline"><span className="font-mono">{r.code}</span> – {r.name}</Link></li>
          ))}
        </ul>
        <p className="mt-3 text-sm"><Link href={`/fault-codes/${b.slug}`} className="font-semibold text-brand-700 hover:underline">All {b.brand} codes →</Link>
          {" · "}<Link href="/pcb-design" className="text-brand-700 hover:underline">Learn PCB design &amp; repair basics</Link>
          {" · "}<Link href="/pcb-repair-course" className="text-brand-700 hover:underline">PCB repair course</Link></p>
      </section>
      <div className="mt-8"><RepairCta place={`${b.brand} drive`} /></div>
    </>
  );
}
