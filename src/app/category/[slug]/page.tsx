import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/data";
import { ShopView, parseShopQuery } from "@/components/ShopView";
import { ProductGridSkeleton } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export async function generateMetadata(props: PageProps<"/category/[slug]">) {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  return category
    ? { title: category.name, description: category.description ?? undefined, alternates: { canonical: `/category/${category.slug}` } }
    : { title: "Category not found" };
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense fallback={<><div className="mb-6 h-24 animate-pulse rounded-md bg-slate-100" /><ProductGridSkeleton /></>}>
        <CategoryContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params, searchParams }: Pick<PageProps<"/category/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const query = parseShopQuery(await searchParams, category.slug);
  return (
    <>
      <Breadcrumbs items={[{ label: "Shop", href: "/products" }, { label: category.name }]} />
      <div className="mb-6 flex items-center gap-4 rounded-md bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
          <CategoryIcon name={category.icon} className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && <p className="text-sm text-brand-100">{category.description}</p>}
        </div>
      </div>
      <ShopView basePath={`/category/${category.slug}`} query={query} fixedCategory />
    </>
  );
}
