import Link from "next/link";
import { getCategories } from "@/lib/data";
import { FREE_SHIPPING_FROM, formatINR } from "@/lib/format";
import { STORE } from "@/lib/constants";
import { HeaderActions } from "./HeaderActions";
import { CategoryMenu } from "./CategoryMenu";
import { MobileMenu } from "./MobileMenu";
import { Logo } from "./Logo";

export async function Header() {
  const categories = await getCategories();
  return (
    <header className="relative z-40">
      {/* Top strip */}
      <div className="bg-slate-900 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5">
          <p className="truncate">
            🚚 Free shipping above {formatINR(FREE_SHIPPING_FROM)} · 💵 Cash on delivery across India
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/track" className="hover:text-white">Track order</Link>
            {STORE.phone && <a href={`tel:${STORE.phone.replace(/\s/g, "")}`} className="hover:text-white">📞 {STORE.phone}</a>}
          </div>
        </div>
      </div>

      {/* Main row */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:flex-nowrap lg:gap-8">
          <MobileMenu categories={categories} />
          <Logo />
          <form action="/products" method="get" role="search" className="order-last flex w-full lg:order-none lg:flex-1">
            <label htmlFor="search-category" className="sr-only">Category</label>
            <select
              id="search-category"
              name="category"
              defaultValue=""
              className="hidden max-w-44 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 outline-none md:block"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search for products, brands, SKUs…"
              className="w-full rounded-l-md border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-600 md:rounded-none"
            />
            <button type="submit" className="flex items-center gap-2 rounded-r-md bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
          <HeaderActions />
        </div>
      </div>

      {/* Category nav bar */}
      <nav className="hidden bg-brand-700 text-white lg:block" aria-label="Main">
        <div className="mx-auto flex max-w-7xl items-stretch px-4">
          <CategoryMenu categories={categories} />
          <ul className="flex items-center text-sm font-medium">
            <li><Link href="/products?sort=newest" className="block px-4 py-3 hover:bg-white/10">New arrivals</Link></li>
            <li><Link href="/products?sort=best-selling" className="block px-4 py-3 hover:bg-white/10">Best sellers</Link></li>
            {categories.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="block px-4 py-3 hover:bg-white/10">{c.name}</Link>
              </li>
            ))}
          </ul>
          <Link href="/pcb-repair" className="ml-auto flex items-center gap-1 bg-accent-500 px-4 text-sm font-semibold hover:bg-accent-600">
            🔧 PCB repair
          </Link>
        </div>
      </nav>
    </header>
  );
}
