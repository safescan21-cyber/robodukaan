import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link href="/" className="hover:text-brand-700">Home</Link></li>
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
