import Link from "@/i18n/client";
import { getT } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import { JsonLd } from "./JsonLd";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// Visible breadcrumb trail + the same trail as BreadcrumbList data for search results.
// Pages that already output their own BreadcrumbList pass schema={false}.
export async function Breadcrumbs({ items, schema = true }: { items: { label: string; href?: string }[]; schema?: boolean }) {
  const { t, locale } = await getT();
  const url = (href: string) => `${SITE}${localizePath(href, locale) === "/" ? "" : localizePath(href, locale)}`;
  return (
    <nav className="mb-4 text-sm text-slate-600" aria-label={t("common.breadcrumb")}>
      {schema && (
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ label: t("common.home"), href: "/" }, ...items].map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.label,
            ...(item.href ? { item: url(item.href) } : {}),
          })),
        }} />
      )}
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link href="/" className="hover:text-brand-700">{t("common.home")}</Link></li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {item.href ? <Link href={item.href} className="hover:text-brand-700">{item.label}</Link> : <span className="text-slate-800">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
