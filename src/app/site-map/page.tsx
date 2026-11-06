import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAllProductLinks, getCategories, getOpenJobs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "All pages on PCBDukaan: product categories, every product, PCB repair, careers and help pages.",
  alternates: { canonical: "/site-map" },
};

const MAIN = [
  ["/", "Home"],
  ["/products", "Shop all products"],
  ["/products?sort=newest", "New arrivals"],
  ["/products?sort=best-selling", "Best sellers"],
  ["/pcb-repair", "PCB repair service"],
  ["/careers", "Careers"],
];
const ACCOUNT = [
  ["/login", "Login"],
  ["/register", "Create an account"],
  ["/account", "My account"],
  ["/account/orders", "My orders"],
  ["/account/repairs", "My PCB repairs"],
  ["/account/addresses", "Saved addresses"],
  ["/wishlist", "Wishlist"],
  ["/cart", "Cart"],
  ["/track", "Track order"],
];
const HELP = [
  ["/about", "About us"],
  ["/contact", "Contact us"],
  ["/shipping-returns", "Shipping & returns"],
  ["/privacy", "Privacy policy"],
];

function LinkList({ title, links }: { title: string; links: string[][] }) {
  return (
    <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="text-brand-700 hover:underline">{label}</Link></li>
        ))}
      </ul>
    </section>
  );
}

export default function SiteMapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: "Sitemap" }]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sitemap</h1>
          <p className="text-sm text-slate-600">Every page on PCBDukaan in one place.</p>
        </div>
        <a href="/sitemap.xml" className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-white">XML sitemap for search engines</a>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <LinkList title="Main pages" links={MAIN} />
        <LinkList title="Your account" links={ACCOUNT} />
        <LinkList title="Help & company" links={HELP} />
      </div>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-md bg-slate-100" />}>
        <CatalogAndJobs />
      </Suspense>
    </div>
  );
}

async function CatalogAndJobs() {
  const [categories, products, jobs] = await Promise.all([getCategories(), getAllProductLinks(), getOpenJobs()]);
  return (
    <>
      <h2 className="mb-4 mt-8 text-xl font-bold">Products by category <span className="text-base font-normal text-slate-500">({products.length})</span></h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const items = products.filter((p) => p.category_id === c.id);
          return (
            <section key={c.id} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                <Link href={`/category/${c.slug}`} className="hover:text-brand-700 hover:underline">{c.name}</Link>
                <span className="text-xs font-normal text-slate-500">({items.length})</span>
              </h3>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Coming soon</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {items.map((p) => (
                    <li key={p.slug}><Link href={`/products/${p.slug}`} className="text-slate-700 hover:text-brand-700 hover:underline">{p.name}</Link></li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <h2 className="mb-4 mt-8 text-xl font-bold">Job openings</h2>
      <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No open positions right now. <Link href="/careers" className="text-brand-700 hover:underline">Careers page</Link></p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {jobs.map((j) => (
              <li key={j.id}><Link href={`/careers/${j.slug}`} className="text-brand-700 hover:underline">{j.title}</Link> <span className="text-slate-500">· {j.location}</span></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
