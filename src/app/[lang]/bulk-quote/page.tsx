import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuoteForm } from "@/components/QuoteForm";
import { alternatesFor, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("quote.pageTitle"), description: t("quote.pageIntro"), alternates: await alternatesFor("/bulk-quote") };
}

export default async function BulkQuotePage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.bulkQuote") }]} />
      <h1 className="text-3xl font-extrabold">{t("quote.pageTitle")}</h1>
      <p className="mt-2 text-slate-700">{t("quote.pageIntro")}</p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        {["quote.b1", "quote.b2", "quote.b3"].map((k) => <li key={k} className="rounded-md bg-white p-3 ring-1 ring-slate-200">✓ {t(k)}</li>)}
      </ul>
      <div className="mt-6"><QuoteForm startOpen /></div>
    </div>
  );
}
