import Link from "@/i18n/client";
import { getCategories } from "@/lib/data";
import { STORE } from "@/lib/constants";
import { Logo } from "./Logo";
import { getT } from "@/i18n/server";

export async function Footer() {
  const categories = await getCategories();
  const { t } = await getT();
  return (
    <footer className="mt-16 bg-slate-900 text-slate-400">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🚚", t("trust.dispatch"), t("trust.dispatchText")],
            ["💵", t("trust.cod"), t("trust.codText")],
            ["🛡️", t("trust.warranty"), t("trust.warrantyText")],
            ["🔧", t("nav.pcbRepair"), t("trust.repairText")],
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
            {t("footer.about")}
          </p>
          {STORE.phone && <p className="mt-4 text-sm">📞 <a href={`tel:${STORE.phone.replace(/\s/g, "")}`} className="hover:text-white">{STORE.phone}</a></p>}
          <p className="mt-4 text-sm">✉️ <a href={`mailto:${STORE.email}`} className="hover:text-white">{STORE.email}</a></p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">{t("footer.categories")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">{t("account.my")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">{t("account.my")}</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">{t("account.orders")}</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">{t("nav.wishlist")}</Link></li>
            <li><Link href="/cart" className="hover:text-white">{t("nav.cart")}</Link></li>
            <li><Link href="/track" className="hover:text-white">{t("nav.trackOrder")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-white">{t("footer.help")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/pcb-repair" className="hover:text-white">{t("nav.pcbRepairService")}</Link></li>
            <li><Link href="/locations" className="hover:text-white">{t("nav.areas")}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{t("nav.contact")}</Link></li>
            <li><Link href="/about" className="hover:text-white">{t("nav.about")}</Link></li>
            <li><Link href="/careers" className="hover:text-white">{t("nav.careers")}</Link></li>
            <li><Link href="/shipping-returns" className="hover:text-white">{t("nav.shipping")}</Link></li>
            <li><Link href="/privacy" className="hover:text-white">{t("nav.privacy")}</Link></li>
            <li><Link href="/site-map" className="hover:text-white">{t("nav.sitemap")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs">
          <p className="flex flex-wrap items-center gap-3">
            <span>{t("footer.rights")}</span>
            <Link href="/site-map" className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1 font-semibold text-slate-200 hover:border-white/50 hover:text-white">🗺️ {t("nav.sitemap")}</Link>
          </p>
          <p>{t("footer.gstNote")}</p>
        </div>
      </div>
    </footer>
  );
}
