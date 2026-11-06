import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Suspense } from "react";
import { getAllProductLinks, getCategories, getOpenJobs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryIcon } from "@/components/CategoryIcon";
import { STATES, areasIn } from "@/lib/locations";
import { getT } from "@/i18n/server";
import { languageAlternates } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.sitemap"), description: t("sitemap.meta"), alternates: { canonical: "/site-map", languages: languageAlternates("/site-map") } };
}

const MAIN = [
  ["/", "common.home"],
  ["/products", "shop.title"],
  ["/products?sort=newest", "nav.newArrivals"],
  ["/products?sort=best-selling", "nav.bestSellers"],
  ["/pcb-repair", "nav.pcbRepairService"],
  ["/careers", "nav.careers"],
  ["/locations", "nav.areas"],
];
const ACCOUNT = [
  ["/login", "auth.login"],
  ["/register", "auth.createAccount"],
  ["/account", "account.my"],
  ["/account/orders", "account.orders"],
  ["/account/repairs", "account.repairs"],
  ["/account/addresses", "account.addresses"],
  ["/wishlist", "nav.wishlist"],
  ["/cart", "nav.cart"],
  ["/track", "nav.trackOrder"],
];
const HELP = [
  ["/about", "nav.about"],
  ["/contact", "nav.contact"],
  ["/shipping-returns", "nav.shipping"],
  ["/privacy", "nav.privacy"],
];

async function LinkList({ title, links }: { title: string; links: string[][] }) {
  const { t } = await getT();
  return (
    <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="text-brand-700 hover:underline">{t(label)}</Link></li>
        ))}
      </ul>
    </section>
  );
}

export default async function SiteMapPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.sitemap") }]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("nav.sitemap")}</h1>
          <p className="text-sm text-slate-600">{t("sitemap.intro")}</p>
        </div>
        <a href="/sitemap.xml" className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-white">{t("sitemap.xml")}</a>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <LinkList title={t("sitemap.main")} links={MAIN} />
        <LinkList title={t("sitemap.account")} links={ACCOUNT} />
        <LinkList title={t("sitemap.help")} links={HELP} />
      </div>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-md bg-slate-100" />}>
        <CatalogAndJobs />
      </Suspense>
    </div>
  );
}

async function CatalogAndJobs() {
  const [categories, products, jobs] = await Promise.all([getCategories(), getAllProductLinks(), getOpenJobs()]);
  const { t } = await getT();
  return (
    <>
      <h2 className="mb-4 mt-8 text-xl font-bold">{t("sitemap.products")} <span className="text-base font-normal text-slate-500">({products.length})</span></h2>
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
                <p className="text-sm text-slate-500">{t("sitemap.soon")}</p>
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
      <h2 className="mb-4 mt-8 text-xl font-bold">{t("nav.areas")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATES.map((s) => (
          <section key={s.slug} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
            <Link href={`/locations/${s.slug}`} className="font-semibold text-brand-700 hover:underline">{s.name}</Link>
            {areasIn(s.slug).length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {areasIn(s.slug).map((x) => (
                  <li key={x.slug}><Link href={`/locations/${s.slug}/${x.slug}`} className="text-slate-700 hover:text-brand-700 hover:underline">{x.name}</Link></li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <h2 className="mb-4 mt-8 text-xl font-bold">{t("sitemap.jobs")}</h2>
      <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">{t("sitemap.noJobs")} <Link href="/careers" className="text-brand-700 hover:underline">{t("nav.careers")}</Link></p>
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
