import Link from "@/i18n/client";
import { getT } from "@/i18n/server";

export async function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const { t } = await getT();
  return (
    <nav className="mb-4 text-sm text-slate-600" aria-label={t("common.breadcrumb")}>
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
