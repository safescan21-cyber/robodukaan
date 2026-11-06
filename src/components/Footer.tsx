import Link from "next/link";
import { getCategories } from "@/lib/data";
import { STORE } from "@/lib/constants";
import { Logo } from "./Logo";

export async function Footer() {
  const categories = await getCategories();
  return (
    <footer className="mt-16 bg-slate-900 text-slate-400">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🚚", "Fast dispatch", "Most orders ship in 24 hours"],
            ["💵", "Cash on delivery", "Pay when it arrives"],
            ["🛡️", "Warranty", "Tested parts with warranty"],
            ["🔧", "PCB repair", "Send photos, get a free quote"],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <span>
                <span className="block font-semibold text-white">{title}</span>
                <span className="text-xs">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Industrial PCBs, power supplies, drive boards, PLC modules, weighing and power components for factories, panel builders and service engineers — plus component-level PCB repair.
          </p>
          <p className="mt-4 text-sm">📞 <a href={`tel:${STORE.phone.replace(/\s/g, "")}`} className="hover:text-white">{STORE.phone}</a></p>
          <p className="mt-1 text-sm">✉️ <a href={`mailto:${STORE.email}`} className="hover:text-white">{STORE.email}</a></p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">Categories</p>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">My account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">My orders</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
            <li><Link href="/track" className="hover:text-white">Track order</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/pcb-repair" className="hover:text-white">PCB repair service</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/shipping-returns" className="hover:text-white">Shipping &amp; returns</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs">
          <p>© PCBDukaan. All rights reserved.</p>
          <p>Prices include GST · Cash on delivery · UPI on delivery</p>
        </div>
      </div>
    </footer>
  );
}
