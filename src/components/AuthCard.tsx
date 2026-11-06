import Link from "next/link";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-md bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
      <p className="mt-6 text-center text-xs text-slate-400"><Link href="/" className="hover:underline">← Back to store</Link></p>
    </div>
  );
}

export const authField =
  "mt-1 w-full rounded border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
export const authButton =
  "w-full rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60";
