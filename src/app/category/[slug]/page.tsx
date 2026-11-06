import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategory } from "@/lib/data";
import { ProductListing, parseSort } from "@/components/ProductListing";
import { ProductGridSkeleton } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<><div className="mb-6 h-20 animate-pulse rounded-xl bg-slate-100" /><ProductGridSkeleton /></>}>
        <CategoryContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({
  params,
  searchParams,
}: Pick<PageProps<"/category/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const sp = await searchParams;

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <span className="text-slate-700">{category.name}</span>
      </nav>
      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-white">
          <CategoryIcon name={category.icon} className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          {category.description && <p className="text-slate-600">{category.description}</p>}
        </div>
      </div>
      <ProductListing basePath={`/category/${category.slug}`} query={{ category: category.slug, sort: parseSort(sp.sort) }} />
    </>
  );
}
