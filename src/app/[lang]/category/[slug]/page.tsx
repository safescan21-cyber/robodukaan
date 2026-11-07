import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/data";
import { ShopView, parseShopQuery } from "@/components/ShopView";
import { ProductGridSkeleton } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getT, alternatesFor } from "@/i18n/server";
import Link from "@/i18n/client";
import { CATEGORY_GUIDES, REPAIR_SERVICES } from "@/lib/seo-content";

export async function generateMetadata(props: PageProps<"/[lang]/category/[slug]">) {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  const { t } = await getT();
  return category
    ? { title: t("meta.categoryTitle", { name: category.name }), description: [category.description, t("meta.categoryTail")].filter(Boolean).join(" "), alternates: await alternatesFor(`/category/${category.slug}`) }
    : { title: t("category.notFound") };
}

export default function CategoryPage(props: PageProps<"/[lang]/category/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense fallback={<><div className="mb-6 h-24 animate-pulse rounded-md bg-slate-100" /><ProductGridSkeleton /></>}>
        <CategoryContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params, searchParams }: Pick<PageProps<"/[lang]/category/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const query = parseShopQuery(await searchParams, category.slug);
  return (
    <>
      <Breadcrumbs items={[{ label: (await getT()).t("nav.shop"), href: "/products" }, { label: category.name }]} />
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
      <CategoryGuide slug={category.slug} name={category.name} />
    </>
  );
}

// Buying guide + common questions under the products (English): helps buyers choose and gives
// search engines real content for the category, plus a link to the matching repair service.
async function CategoryGuide({ slug, name }: { slug: string; name: string }) {
  const guide = CATEGORY_GUIDES[slug];
  if (!guide) return null;
  const { t } = await getT();
  const repair = REPAIR_SERVICES.find((r) => r.category === slug);
  return (
    <section className="mt-10 grid gap-6 rounded-md bg-white p-6 ring-1 ring-slate-200 lg:grid-cols-2">
      <div>
        <h2 className="text-xl font-bold">{name}: how to choose</h2>
        <p className="mt-2 text-slate-700">{guide.intro}</p>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-slate-700">{guide.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/replacement-finder" className="font-semibold text-brand-700 hover:underline">🔁 {t("nav.finder")}</Link>
          <Link href="/bulk-quote" className="font-semibold text-brand-700 hover:underline">💼 {t("nav.bulkQuote")}</Link>
          {repair && <Link href={`/pcb-repair/${repair.slug}`} className="font-semibold text-brand-700 hover:underline">🔧 {repair.name}</Link>}
        </p>
      </div>
      <div>
        <h2 className="text-xl font-bold">{t("product.faqs")}</h2>
        <dl className="mt-2 space-y-3">
          {guide.faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-0.5 text-sm text-slate-700">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
