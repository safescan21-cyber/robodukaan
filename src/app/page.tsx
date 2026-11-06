import Link from "next/link";
import { Suspense } from "react";
import { getCategories, getFeaturedProducts } from "@/lib/data";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SetupNotice } from "@/components/SetupNotice";

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-400">
              Build · Learn · Innovate
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Everything you need to build your next robot.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-brand-100">
              Development boards, sensors, motors, drone parts and DIY kits, shipped across India with cash on delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="rounded-lg bg-accent-500 px-6 py-3 font-semibold text-white hover:bg-accent-600">
                Shop all products
              </Link>
              <Link href="/category/diy-kits" className="rounded-lg bg-white/10 px-6 py-3 font-semibold text-white ring-1 ring-white/30 hover:bg-white/20">
                Explore DIY kits
              </Link>
            </div>
          </div>
          <div className="hidden grid-cols-3 gap-4 md:grid" aria-hidden="true">
            {["chip", "sensor", "motor", "drone", "battery", "wifi"].map((icon, i) => (
              <div
                key={icon}
                className={`flex aspect-square items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 ${i % 2 ? "translate-y-6" : ""}`}
              >
                <CategoryIcon name={icon} className="h-12 w-12 text-accent-400" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-bold">Shop by category</h2>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-slate-100" />}>
          <Categories />
        </Suspense>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured products</h2>
          <Link href="/products" className="text-sm font-semibold text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6">
          <Suspense fallback={<ProductGridSkeleton />}>
            <Featured />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <div className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200 sm:grid-cols-3">
          {[
            ["🚚", "Free shipping", "On all orders above ₹499"],
            ["💵", "Cash on delivery", "Pay when your order arrives"],
            ["🛠️", "Maker support", "Help choosing the right parts"],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex items-center gap-4">
              <span className="text-3xl" aria-hidden="true">{icon}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

async function Categories() {
  const categories = await getCategories();
  if (categories.length === 0) return <div className="mt-6"><SetupNotice /></div>;
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className="group flex flex-col items-center gap-3 rounded-xl bg-white p-5 text-center ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-600"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white">
            <CategoryIcon name={c.icon} className="h-7 w-7" />
          </span>
          <span className="text-sm font-semibold">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

async function Featured() {
  const products = await getFeaturedProducts(8);
  if (products.length === 0) return <SetupNotice />;
  return <ProductGrid products={products} />;
}
