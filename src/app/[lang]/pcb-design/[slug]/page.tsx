import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ExpertBox } from "@/components/ExpertBox";
import { getT } from "@/i18n/server";
import { PCB_LESSONS, getPcbLesson } from "@/lib/pcb-design";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// English pages are built ahead; other languages on first visit (content is English).
export async function generateStaticParams() {
  const all = PCB_LESSONS.map((l) => ({ slug: l.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/pcb-design/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const l = getPcbLesson(slug);
  if (!l) return { title: "Not found" };
  return { title: l.title, description: l.description, alternates: { canonical: `/pcb-design/${l.slug}` } };
}

export default function LessonPage(props: PageProps<"/[lang]/pcb-design/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Lesson params={props.params} /></Suspense>
    </div>
  );
}

async function Lesson({ params }: Pick<PageProps<"/[lang]/pcb-design/[slug]">, "params">) {
  const { slug } = await params;
  const l = getPcbLesson(slug);
  if (!l) notFound();
  const { t } = await getT();
  const i = PCB_LESSONS.indexOf(l);
  const prev = PCB_LESSONS[i - 1];
  const next = PCB_LESSONS[i + 1];
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "Article", headline: l.h1, description: l.description,
          url: `${SITE}/pcb-design/${l.slug}`, inLanguage: "en", educationalLevel: l.level, timeRequired: `PT${l.minutes}M`,
          publisher: { "@type": "Organization", name: "PCBDukaan", url: SITE },
        },
        {
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: l.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ]} />
      <Breadcrumbs items={[{ label: t("nav.pcbDesign"), href: "/pcb-design" }, { label: l.h1 }]} />
      <p className="text-xs font-semibold uppercase text-accent-700">Lesson {i + 1} of {PCB_LESSONS.length} · {l.level} · {l.minutes} min</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{l.h1}</h1>
      <p className="mt-3 text-slate-700">{l.intro}</p>

      {l.sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="text-xl font-bold">{s.h}</h2>
          {s.p?.map((x) => <p key={x} className="mt-2 text-slate-700">{x}</p>)}
          {s.list && <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
          {s.table && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] bg-white text-sm ring-1 ring-slate-200">
                <thead className="bg-slate-50 text-left"><tr>{s.table.head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r) => <tr key={r.join("|")} className="border-t border-slate-100">{r.map((c, k) => <td key={k} className="px-3 py-2 text-slate-700">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <ExpertBox path={`/pcb-design/${l.slug}`} className="mt-8" />
      <section className="mt-8">
        <h2 className="text-xl font-bold">Questions</h2>
        <dl className="mt-2 space-y-3">
          {l.faqs.map((f) => <div key={f.q}><dt className="font-semibold">{f.q}</dt><dd className="text-slate-700">{f.a}</dd></div>)}
        </dl>
      </section>

      <nav className="mt-8 flex justify-between gap-4 text-sm">
        {prev ? <Link href={`/pcb-design/${prev.slug}`} className="text-brand-700 hover:underline">← {prev.h1}</Link> : <span />}
        {next ? <Link href={`/pcb-design/${next.slug}`} className="text-end text-brand-700 hover:underline">{next.h1} →</Link> : <Link href="/pcb-design" className="text-brand-700 hover:underline">All lessons →</Link>}
      </nav>
      <div className="mt-6 rounded-md bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-200">
        🎓 Learn hands-on in our <Link href="/pcb-repair-course" className="font-semibold underline">PCB repair course</Link>
        {" · "}🔧 Board failed? <Link href="/pcb-repair" className="font-semibold underline">{t("loc.getQuote")}</Link>
        {" · "}<Link href="/fault-codes" className="underline">{t("nav.faultCodes")}</Link>
      </div>
    </>
  );
}
