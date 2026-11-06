import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListing, parseSort } from "@/components/ProductListing";
import { ProductGridSkeleton } from "@/components/ProductCard";

export const metadata: Metadata = { title: "All products" };

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">All products</h1>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  return <ProductListing basePath="/products" query={{ q: q || undefined, sort: parseSort(params.sort) }} />;
}
