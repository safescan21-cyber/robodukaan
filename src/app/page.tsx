import Link from "next/link";
import { Suspense } from "react";
import { getBanners, getCategories, getProductRow } from "@/lib/data";
import { ProductGridSkeleton, ProductRow, SectionHeading } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HeroSlider } from "@/components/HeroSlider";
import { SetupNotice } from "@/components/SetupNotice";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5">
      <Suspense fallback={<div className="h-56 animate-pulse rounded-md bg-slate-200 sm:h-72 lg:h-[340px]" />}>
        <Hero />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-slate-100" />}>
        <Categories />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="Deals of the day" sort="popular" featured href="/products" />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/category/drone-parts" className="group relative overflow-hidden rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">Up to 40% off</p>
          <p className="mt-2 text-2xl font-extrabold">Drone parts &amp; accessories</p>
          <p className="mt-1 text-sm text-slate-300">Motors, ESCs, frames, props</p>
          <span className="mt-4 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">Shop now →</span>
          <CategoryIcon name="drone" className="absolute -bottom-4 -right-4 h-36 w-36 text-white/10" />
        </Link>
        <Link href="/category/sensors" className="group relative overflow-hidden rounded-md bg-gradient-to-r from-accent-600 to-amber-500 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-100">Starting ₹35</p>
          <p className="mt-2 text-2xl font-extrabold">Sensors &amp; modules</p>
          <p className="mt-1 text-sm text-amber-50">Ultrasonic, IMU, gas, temperature</p>
          <span className="mt-4 inline-block text-sm font-semibold underline-offset-4 group-hover:underline">Shop now →</span>
          <CategoryIcon name="sensor" className="absolute -bottom-4 -right-4 h-36 w-36 text-white/15" />
        </Link>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="Best sellers" sort="best-selling" href="/products?sort=best-selling" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="New arrivals" sort="newest" href="/products?sort=newest" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="Development boards" sort="popular" category="development-boards" href="/category/development-boards" />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Row title="DIY kits" sort="popular" category="diy-kits" href="/category/diy-kits" />
      </Suspense>
    </div>
  );
}

async function Hero() {
  const banners = await getBanners();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      {banners.length > 0 ? (
        <HeroSlider banners={banners} />
      ) : (
        <div className="flex h-56 items-center rounded-md bg-gradient-to-r from-brand-800 to-brand-600 px-8 text-white sm:h-72 lg:h-[340px]">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Everything you need to build your next robot.</h1>
            <Link href="/products" className="mt-6 inline-block rounded-md bg-white px-6 py-2.5 font-bold text-slate-900">Shop now</Link>
          </div>
        </div>
      )}
      <div className="hidden grid-rows-2 gap-4 lg:grid">
        <Link href="/category/development-boards" className="group relative overflow-hidden rounded-md bg-brand-50 p-5 ring-1 ring-brand-100">
          <p className="text-xs font-semibold uppercase text-brand-700">New stock</p>
          <p className="mt-1 text-lg font-bold text-slate-900">ESP32 &amp; Pico W boards</p>
          <p className="mt-2 text-sm font-semibold text-accent-600 group-hover:underline">Shop boards →</p>
          <CategoryIcon name="chip" className="absolute -bottom-3 -right-3 h-24 w-24 text-brand-600/20" />
        </Link>
        <Link href="/category/batteries-power" className="group relative overflow-hidden rounded-md bg-accent-50 p-5 ring-1 ring-accent-400/30">
          <p className="text-xs font-semibold uppercase text-accent-600">Power up</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Batteries &amp; chargers</p>
          <p className="mt-2 text-sm font-semibold text-brand-700 group-hover:underline">Shop power →</p>
          <CategoryIcon name="battery" className="absolute -bottom-3 -right-3 h-24 w-24 text-accent-500/25" />
        </Link>
      </div>
    </div>
  );
}

async function Categories() {
  const categories = await getCategories();
  if (categories.length === 0) return <SetupNotice />;
  return (
    <section>
      <SectionHeading title="Shop by category" href="/products" />
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
  href,
}: {
  title: string;
  sort: "popular" | "best-selling" | "newest";
  category?: string;
  featured?: boolean;
  href: string;
}) {
  const products = await getProductRow(sort, { category, featured, limit: 10 });
  if (products.length === 0) return null;
  return (
    <section>
      <SectionHeading title={title} href={href} />
      <ProductRow products={products} />
    </section>
  );
}
