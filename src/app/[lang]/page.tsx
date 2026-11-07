import Link from "@/i18n/client";
import { Suspense } from "react";
import { getBanners, getCategories, getProductRow } from "@/lib/data";
import { ProductGridSkeleton, ProductRow, SectionHeading } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HeroSlider } from "@/components/HeroSlider";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { SetupNotice } from "@/components/SetupNotice";
import type { Metadata } from "next";
import { alternatesFor, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await alternatesFor("/") };
}

export default async function HomePage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5">
      <h1 className="sr-only">{t("meta.title")}</h1>
      <Suspense fallback={<div className="h-56 animate-pulse rounded-md bg-slate-200 sm:h-72 lg:h-[340px]" />}>
        <Hero />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-slate-100" />}>
        <Categories />
      </Suspense>

      <Services t={t} />

      <RecentlyViewed />

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="home.deals" sort="popular" featured href="/products" />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/category/vfd-motor-drives" className="group relative overflow-hidden rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{t("home.drivesTag")}</p>
          <p className="mt-2 text-2xl font-extrabold">{t("home.drivesTitle")}</p>
          <p className="mt-1 text-sm text-slate-300">{t("home.drivesText")}</p>
          <span className="mt-4 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">{t("common.shopNow")} <span className="inline-block rtl:-scale-x-100">→</span></span>
          <CategoryIcon name="motor" className="absolute -bottom-4 -right-4 h-36 w-36 text-white/10" />
        </Link>
        <Link href="/category/load-cells-weighing" className="group relative overflow-hidden rounded-md bg-gradient-to-r from-accent-600 to-amber-500 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-100">{t("home.weighTag")}</p>
          <p className="mt-2 text-2xl font-extrabold">{t("home.weighTitle")}</p>
          <p className="mt-1 text-sm text-amber-50">{t("home.weighText")}</p>
          <span className="mt-4 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">{t("common.shopNow")} <span className="inline-block rtl:-scale-x-100">→</span></span>
          <CategoryIcon name="scale" className="absolute -bottom-4 -right-4 h-36 w-36 text-white/15" />
        </Link>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="nav.bestSellers" sort="best-selling" href="/products?sort=best-selling" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="nav.newArrivals" sort="newest" newArrival href="/products?new=1" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="home.smpsRow" sort="popular" category="smps-power-supplies" href="/category/smps-power-supplies" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="home.toolsRow" sort="popular" category="test-repair-tools" href="/category/test-repair-tools" />
      </Suspense>
    </div>
  );
}

async function Hero() {
  const { t } = await getT();
  const banners = await getBanners();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      {banners.length > 0 ? (
        <HeroSlider banners={banners} />
      ) : (
        <div className="flex h-56 items-center rounded-md bg-gradient-to-r from-brand-800 to-brand-600 px-8 text-white sm:h-72 lg:h-[340px]">
          <div>
            <p className="text-3xl font-extrabold sm:text-4xl">{t("home.heroFallback")}</p>
            <Link href="/products" className="mt-6 inline-block rounded-md bg-white px-6 py-2.5 font-bold text-slate-900">{t("common.shopNow")}</Link>
          </div>
        </div>
      )}
      <div className="hidden grid-rows-2 gap-4 lg:grid">
        <Link href="/pcb-repair" className="group relative overflow-hidden rounded-md bg-brand-50 p-5 ring-1 ring-brand-100">
          <p className="text-xs font-semibold uppercase text-brand-700">{t("home.freeQuote")}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{t("home.repairTitle")}</p>
          <p className="mt-2 text-sm font-semibold text-accent-600 group-hover:underline">{t("home.sendPhotos")} <span className="inline-block rtl:-scale-x-100">→</span></p>
          <CategoryIcon name="pcb" className="absolute -bottom-3 -right-3 h-24 w-24 text-brand-600/20" />
        </Link>
        <Link href="/category/plc-io-modules" className="group relative overflow-hidden rounded-md bg-accent-50 p-5 ring-1 ring-accent-400/30">
          <p className="text-xs font-semibold uppercase text-accent-600">{t("home.autoTag")}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{t("home.plcTitle")}</p>
          <p className="mt-2 text-sm font-semibold text-brand-700 group-hover:underline">{t("home.shopPlc")} <span className="inline-block rtl:-scale-x-100">→</span></p>
          <CategoryIcon name="chip" className="absolute -bottom-3 -right-3 h-24 w-24 text-accent-500/25" />
        </Link>
      </div>
    </div>
  );
}

async function Categories() {
  const { t } = await getT();
  const categories = await getCategories();
  if (categories.length === 0) return <SetupNotice />;
  return (
    <section>
      <SectionHeading title={t("home.shopByCategory")} href="/products" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white text-brand-600 ring-1 ring-slate-200 transition group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <CategoryIcon name={c.icon} className="h-9 w-9" />
              )}
            </span>
            <span className="text-xs font-semibold leading-tight text-slate-700 group-hover:text-brand-700">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function Row({
  title,
  sort,
  category,
  featured,
  newArrival,
  href,
}: {
  title: string;
  sort: "popular" | "best-selling" | "newest";
  category?: string;
  featured?: boolean;
  newArrival?: boolean;
  href: string;
}) {
  let products = await getProductRow(sort, { category, featured, newArrival, limit: 10 });
  // Nothing ticked as "New arrival" yet: show the latest products instead of an empty row.
  if (newArrival && products.length === 0) products = await getProductRow("newest", { category, limit: 10 });
  if (products.length === 0) return null;
  return (
    <section>
      <SectionHeading title={(await getT()).t(title)} href={href} />
      <ProductRow products={products} />
    </section>
  );
}

// What competitors don't offer: repair + parts + know-how in one place.
function Services({ t }: { t: (k: string) => string }) {
  const items: [string, string, string, string][] = [
    ["🔧", "home.svcRepair", "home.svcRepairText", "/pcb-repair"],
    ["🔁", "home.svcFinder", "home.svcFinderText", "/replacement-finder"],
    ["⚠️", "home.svcFault", "home.svcFaultText", "/fault-codes"],
    ["💼", "home.svcQuote", "home.svcQuoteText", "/bulk-quote"],
  ];
  return (
    <section>
      <SectionHeading title={t("home.servicesTitle")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([icon, title, text, href]) => (
          <Link key={href} href={href} className="group flex gap-3 rounded-md bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <span>
              <span className="block font-bold group-hover:text-brand-700">{t(title)}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{t(text)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
