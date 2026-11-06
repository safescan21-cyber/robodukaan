import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView, parseShopQuery } from "@/components/ShopView";
import { ProductGridSkeleton } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Shop all products" };

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Shop" }]} />
      <h1 className="mb-5 text-2xl font-bold">Shop</h1>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const query = parseShopQuery(await searchParams);
  return <ShopView basePath="/products" query={query} />;
}
