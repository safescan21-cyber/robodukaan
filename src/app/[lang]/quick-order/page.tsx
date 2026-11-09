import type { Metadata } from "next";
import { alternatesFor, getT } from "@/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuickOrder } from "./QuickOrder";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("quick.metaTitle"), description: t("quick.metaDesc"), alternates: await alternatesFor("/quick-order") };
}

// Quick order / BOM: paste or upload a parts list (part number + quantity), see price and stock for all,
// add everything to the cart at once, and ask for a quote for anything not listed.
export default async function QuickOrderPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("quick.title") }]} />
      <h1 className="text-3xl font-extrabold">{t("quick.title")}</h1>
      <p className="mb-5 mt-1 text-slate-600">{t("quick.intro")}</p>
      <QuickOrder />
    </div>
  );
}
