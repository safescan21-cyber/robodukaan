import Link from "next/link";
import { getCategories } from "@/lib/data";
import { CartLink } from "./CartLink";
import { FREE_SHIPPING_FROM, formatINR } from "@/lib/format";

export async function Header() {
  const categories = await getCategories();
  return (
    <header className="sticky top-0 z-30 shadow-sm">
      <div className="bg-accent-500 px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">
        Free shipping on orders above {formatINR(FREE_SHIPPING_FROM)} · Cash on delivery across India
      </div>
      <div className="bg-brand-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-lg font-black">R</span>
            <span className="text-xl font-extrabold tracking-tight">
              Robo<span className="text-accent-400">Dukaan</span>
            </span>
          </Link>
          <form action="/products" method="get" className="order-3 flex w-full sm:order-none sm:flex-1" role="search">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search Arduino, sensors, motors…"
              className="w-full rounded-l-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="rounded-r-lg bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600">
              Search
            </button>
          </form>
          <nav className="ml-auto flex items-center gap-1 sm:ml-0">
            <Link href="/track" className="rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
              Track order
            </Link>
            <CartLink />
          </nav>
        </div>
      </div>
      {categories.length > 0 && (
        <nav className="border-b border-slate-200 bg-white" aria-label="Categories">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm">
            <li>
              <Link href="/products" className="block whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                All products
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="block whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
