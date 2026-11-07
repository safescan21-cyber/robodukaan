import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { alternatesFor, getT } from "@/i18n/server";
import { localizePath } from "@/i18n/config";

const EXAMPLES = ["Omron E2E", "Mean Well NDR", "Autonics PR18", "Fotek SSR", "Delta VFD-M", "TB6600", "IRFP460", "MAX485"];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("finder.title"), description: t("finder.intro").slice(0, 158), alternates: await alternatesFor("/replacement-finder") };
}

export default async function ReplacementFinderPage() {
  const { t, locale } = await getT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.finder") }]} />
      <h1 className="text-3xl font-extrabold">🔁 {t("finder.title")}</h1>
      <p className="mt-2 text-slate-700">{t("finder.intro")}</p>
      {/* Plain GET form: works without JavaScript; search also matches the "replaces" part numbers. */}
      <form action={localizePath("/products", locale)} method="get" className="mt-5 flex gap-2">
        <label htmlFor="finder-q" className="sr-only">{t("finder.title")}</label>
        <input id="finder-q" name="q" required minLength={2} maxLength={60} placeholder={t("finder.placeholder")}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        <button className="shrink-0 rounded-md bg-accent-500 px-5 py-3 font-semibold text-white hover:bg-accent-600">{t("finder.button")}</button>
      </form>
      <p className="mt-6 text-sm font-semibold">{t("finder.examples")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => <Link key={e} href={`/products?q=${encodeURIComponent(e)}`} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-300 hover:ring-brand-600">{e}</Link>)}
      </div>
      <div className="mt-8 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <p className="text-sm text-slate-700">{t("finder.notFound")}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/bulk-quote" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("nav.bulkQuote")}</Link>
          <Link href="/contact" className="rounded-md px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">{t("nav.contact")}</Link>
        </div>
      </div>
    </div>
  );
}
