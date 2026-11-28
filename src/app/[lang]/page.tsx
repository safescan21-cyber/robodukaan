import Link from "@/i18n/client";
import { Suspense } from "react";
import { getBanners, getCategories, getProductRow } from "@/lib/data";
import { ProductGridSkeleton, ProductRow, SectionHeading } from "@/components/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HeroSlider } from "@/components/HeroSlider";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { SetupNotice } from "@/components/SetupNotice";
import { FaultSearch } from "@/components/FaultSearch";
import { DRIVE_BRANDS, faultSearchItems } from "@/lib/fault-codes";
import { ELECTRICAL_FAULTS } from "@/lib/electrical-faults";
import { PCB_LESSONS } from "@/lib/pcb-design";
import { REPAIR_BRANDS } from "@/lib/repair-brands";
import { REPAIR_TERMS } from "@/lib/constants";
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

      <FixHub />

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
          <p className="mt-2 text-sm font-semibold text-accent-700 group-hover:underline">{t("home.sendPhotos")} <span className="inline-block rtl:-scale-x-100">→</span></p>
          <CategoryIcon name="pcb" className="absolute -bottom-3 -right-3 h-24 w-24 text-brand-600/20" />
        </Link>
        <Link href="/category/plc-io-modules" className="group relative overflow-hidden rounded-md bg-accent-50 p-5 ring-1 ring-accent-400/30">
          <p className="text-xs font-semibold uppercase text-accent-700">{t("home.autoTag")}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{t("home.plcTitle")}</p>
          <p className="mt-2 text-sm font-semibold text-brand-700 group-hover:underline">{t("home.shopPlc")} <span className="inline-block rtl:-scale-x-100">→</span></p>
          <CategoryIcon name="chip" className="absolute -bottom-3 -right-3 h-24 w-24 text-accent-500/25" />
        </Link>
      </div>
    </div>
  );
}

// Soft colour per category tile so the grid isn't all one blue.
const TILE = [
  "bg-brand-50 text-brand-700", "bg-amber-50 text-amber-600", "bg-violet-50 text-violet-700", "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700", "bg-rose-50 text-rose-600", "bg-orange-50 text-orange-600", "bg-teal-50 text-teal-700",
  "bg-indigo-50 text-indigo-700", "bg-lime-50 text-lime-700", "bg-cyan-50 text-cyan-700", "bg-fuchsia-50 text-fuchsia-700",
];

// "Machine stopped?" – error-code search, repair, electrical faults and learning, with real counts from the site.
function FixHub() {
  const codes = DRIVE_BRANDS.reduce((n, b) => n + b.codes.length, 0);
  const seen = new Set<string>();
  const brands = REPAIR_BRANDS.filter((b) => b.service === "vfd-drive-repair" || b.service === "servo-drive-repair" || b.service === "plc-repair")
    .filter((b) => { const k = b.brand.split(" ")[0]; if (seen.has(k)) return false; seen.add(k); return true; });
  const cards = [
    { href: "/pcb-repair", icon: "wrench", tone: "from-accent-500 to-orange-600", title: "PCB repair", text: `Component-level repair of VFD, SMPS, PLC, servo and HMI boards${REPAIR_TERMS.warrantyMonths ? ` · ${REPAIR_TERMS.warrantyMonths}-month warranty` : ""}`, cta: "Get a free quote" },
    { href: "/electrical-faults", icon: "power", tone: "from-amber-500 to-yellow-600", title: "Electrical faults", text: `${ELECTRICAL_FAULTS.length} guides – MCB/RCCB tripping, earthing, single phasing, motor overheating`, cta: "Find the cause" },
    { href: "/pcb-design", icon: "pcb", tone: "from-emerald-500 to-teal-600", title: "Learn PCB design", text: `${PCB_LESSONS.length} free lessons, from PCB basics to Gerber files`, cta: "Start learning" },
    { href: "/pcb-repair-course", icon: "kit", tone: "from-violet-500 to-indigo-600", title: "PCB repair course", text: "Hands-on training on real industrial boards", cta: "See the course" },
  ];
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-800 text-white shadow-lg">
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-5 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">Machine stopped?</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Find what the error code means</h2>
          <p className="mt-2 max-w-xl text-slate-300">{codes} VFD, servo and PLC error codes from {DRIVE_BRANDS.length} brands – meaning, causes and what to check first.</p>
          <div className="mt-5 max-w-xl"><FaultSearch items={faultSearchItems()} /></div>
          <p className="mt-4 text-sm text-slate-300">Still faulty? <Link href="/pcb-repair" className="font-semibold text-accent-400 hover:underline">Send board photos for a free repair quote →</Link></p>
        </div>
        <div className="relative grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="group flex items-center gap-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${c.tone}`}><CategoryIcon name={c.icon} className="h-6 w-6" /></span>
              <span className="min-w-0">
                <span className="block font-bold">{c.title}</span>
                <span className="block text-xs text-slate-300">{c.text}</span>
                <span className="mt-1 block text-xs font-semibold text-accent-400 group-hover:underline">{c.cta} <span className="inline-block rtl:-scale-x-100">→</span></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/10 bg-black/20 px-6 py-4 sm:px-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Brands we repair</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link key={`${b.service}/${b.slug}`} href={`/pcb-repair/${b.service}/${b.slug}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/15 hover:bg-white hover:text-slate-900">{b.brand.replace(/ \(.*\)$/, "")}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Categories() {
  const { t } = await getT();
  const categories = await getCategories();
  if (categories.length === 0) return <SetupNotice />;
  return (
    <section>
      <SectionHeading title={t("home.shopByCategory")} href="/products" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((c, i) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-3 rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500 sm:p-4">
            <span className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl transition group-hover:scale-105 sm:h-16 sm:w-16 ${TILE[i % TILE.length]}`}>
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <CategoryIcon name={c.icon} className="h-8 w-8" />
              )}
            </span>
            <span className="text-xs font-semibold leading-tight text-slate-700 group-hover:text-brand-700 sm:text-sm">{c.name}</span>
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
          <Link key={href} href={href} className="group flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl" aria-hidden="true">{icon}</span>
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
