import { Breadcrumbs } from "./Breadcrumbs";

export function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumbs items={[{ label: title }]} />
      <article className="rounded-md bg-white p-6 ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </div>
  );
}
