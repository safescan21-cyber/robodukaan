import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView, parseShopQuery } from "@/components/ShopView";
import { ProductGridSkeleton } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getT, alternatesFor } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("shop.title"), description: t("meta.products"), alternates: await alternatesFor("/products") };
}

export default async function ProductsPage(props: PageProps<"/[lang]/products">) {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.shop") }]} />
      <h1 className="mb-5 text-2xl font-bold">{t("nav.shop")}</h1>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[lang]/products">["searchParams"] }) {
  const query = parseShopQuery(await searchParams);
  return <ShopView basePath="/products" query={query} />;
}
