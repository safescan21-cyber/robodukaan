import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CompareView } from "./CompareView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("compare.title"), robots: { index: false, follow: true } };
}

export default async function ComparePage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("compare.title") }]} />
      <h1 className="mb-4 text-2xl font-bold">{t("compare.title")}</h1>
      <CompareView />
    </div>
  );
}
