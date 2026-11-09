import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { RepairCta } from "@/components/LocationBlocks";
import { getT } from "@/i18n/server";
import { getRepairGuide } from "@/lib/repair-guides";
import { DRIVE_BRANDS, getDriveBrand } from "@/lib/fault-codes";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// English pages are built ahead; other languages on first visit (content is English).
export async function generateStaticParams() {
  const all = DRIVE_BRANDS.map((b) => ({ brand: b.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/fault-codes/[brand]">): Promise<Metadata> {
  const { brand } = await props.params;
  const b = getDriveBrand(brand);
  if (!b) return { title: "Not found" };
  const codes = b.codes.slice(0, 4).map((c) => c.code).join(", ");
  const short = b.codes.slice(0, 2).map((c) => c.code).join(", ");
  // Keep titles under ~60 characters (with " | PCBDukaan") so Google shows them in full.
  const main = `${b.brand} VFD fault codes – meaning & fix`;
  return {
    title: `${main} (${short}…)`.length <= 52 ? `${main} (${short}…)` : main,
    description: `${b.brand} drive error codes ${codes} and more explained: meaning, common causes and what to check. ${b.series}.`.slice(0, 158),
    alternates: { canonical: `/fault-codes/${b.slug}` },
  };
}

export default function BrandFaultsPage(props: PageProps<"/[lang]/fault-codes/[brand]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <BrandFaults params={props.params} />
      </Suspense>
    </div>
  );
}

async function BrandFaults({ params }: Pick<PageProps<"/[lang]/fault-codes/[brand]">, "params">) {
  const { brand } = await params;
  const b = getDriveBrand(brand);
  if (!b) notFound();
  const { t } = await getT();
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "VFD fault codes", item: `${SITE}/fault-codes` },
          { "@type": "ListItem", position: 3, name: `${b.brand} fault codes`, item: `${SITE}/fault-codes/${b.slug}` },
        ],
      }} />
      <Breadcrumbs schema={false} items={[{ label: t("nav.faultCodes"), href: "/fault-codes" }, { label: b.brand }]} />
      <h1 className="text-3xl font-extrabold">{b.brand} VFD fault codes</h1>
      <p className="mt-1 text-sm text-slate-500">{b.series}</p>
      <p className="mt-3 max-w-3xl text-slate-700">{b.intro}</p>

      <nav aria-label={`${b.brand} fault codes`} className="mt-4 flex flex-wrap gap-2">
        {b.codes.map((c) => (
          <a key={c.code} href={`#${c.code.split(" ")[0].replace(/[^A-Za-z0-9]/g, "")}`} className="rounded-full bg-white px-3 py-1 font-mono text-xs ring-1 ring-slate-300 hover:ring-brand-600">{c.code.split(" ")[0]}</a>
        ))}
      </nav>

      <div className="mt-6 space-y-4">
        {b.codes.map((c) => (
          <section key={c.code} id={c.code.split(" ")[0].replace(/[^A-Za-z0-9]/g, "")} className="scroll-mt-24 rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-lg font-bold"><span className="me-2 rounded bg-slate-900 px-2 py-0.5 font-mono text-sm text-white">{c.code}</span>{c.name}</h2>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-900">{t("fault.causes")}</p>
                <ul className="mt-1 list-disc space-y-0.5 ps-5 text-slate-700">{c.causes.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{t("fault.check")}</p>
                <ul className="mt-1 list-disc space-y-0.5 ps-5 text-slate-700">{c.check.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </div>
            {c.board && (
              <p className="mt-3 rounded bg-brand-50 px-3 py-2 text-sm text-brand-900">
                🔧 {t("fault.repairCta")} <Link href="/pcb-repair" className="font-semibold underline">{t("loc.getQuote")}</Link>
              </p>
            )}
          </section>
        ))}
      </div>

      <p className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {t("fault.note")}</p>
      <p className="mt-4 text-sm">📘 {t("nav.repairGuides")}:{" "}
        {["vfd-overcurrent-fault", "how-to-test-igbt-module", "vfd-capacitor-failure"].map((slug, i) => {
          const g = getRepairGuide(slug)!;
          return <span key={slug}>{i ? " · " : ""}<Link href={`/repair-guides/${slug}`} className="text-brand-700 hover:underline">{g.title}</Link></span>;
        })}
      </p>
      <p className="mt-4 text-sm">{t("fault.other")}{" "}
        {DRIVE_BRANDS.filter((x) => x.slug !== b.slug).map((x, i) => (
          <span key={x.slug}>{i ? " · " : ""}<Link href={`/fault-codes/${x.slug}`} className="text-brand-700 hover:underline">{x.brand}</Link></span>
        ))}
      </p>
      <div className="mt-8"><RepairCta place={`${b.brand} drive`} /></div>
    </>
  );
}
