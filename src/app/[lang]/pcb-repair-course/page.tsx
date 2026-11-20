import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getCourse } from "@/lib/data";
import { getT } from "@/i18n/server";
import { CourseEnquiryForm } from "./CourseEnquiryForm";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "PCB repair course – VFD, SMPS & PLC repair training",
  description: "Learn industrial PCB repair at component level: SMPS, VFD/inverter, PLC and HMI boards, component testing, soldering and fault finding with practice on real boards. Enquire for fee and next batch.",
  alternates: { canonical: "/pcb-repair-course" },
};

// Links like /repair-guides inside admin-written text become real links.
function withLinks(text: string) {
  return text.split(/(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)/g).map((part, i) =>
    /^\/[a-z0-9-]+/.test(part) ? <Link key={i} href={part} className="font-semibold text-brand-700 underline">{part}</Link> : part);
}

async function Course() {
  const [c, { t }] = await Promise.all([getCourse(), getT()]);
  const facts = ([["🏫", "Mode", c.mode], ["⏱️", "Duration", c.duration], ["💰", "Fee", c.fee], ["🗣️", "Language", c.language], ["📍", "Location", c.location], ["📅", "Next batch", c.nextBatch], ["🎓", "Certificate", c.certificate]] as const).filter(([, , v]) => v);
  const mode = /online/i.test(c.mode) && /class|practical|offline|onsite|hands/i.test(c.mode) ? "Blended" : /online/i.test(c.mode) ? "Online" : c.mode ? "Onsite" : null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Course", name: c.title, description: c.intro,
        url: `${SITE}/pcb-repair-course`, inLanguage: c.language || "en-IN",
        provider: { "@type": "Organization", name: "PCBDukaan", sameAs: SITE },
        syllabusSections: c.modules.map((m) => ({ "@type": "Syllabus", name: m.title, description: m.topics.join("; ") })),
        ...(mode || c.duration ? { hasCourseInstance: [{ "@type": "CourseInstance", ...(mode ? { courseMode: mode } : {}), ...(c.location ? { location: c.location } : {}), ...(c.duration ? { courseWorkload: c.duration } : {}) }] } : {}),
        ...(c.fee ? { offers: [{ "@type": "Offer", category: "Paid", priceCurrency: "INR", ...(/(\d[\d,]*)/.test(c.fee) ? { price: c.fee.match(/(\d[\d,]*)/)![1].replace(/,/g, "") } : {}) }] } : {}),
      }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: "PCB repair course" }]} />

      <section className="rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-6 text-white">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{c.title}</h1>
        <p className="mt-1 text-sm text-brand-100" lang="hi">PCB रिपेयर कोर्स – VFD, SMPS, PLC बोर्ड रिपेयर सीखें</p>
        <p className="mt-3 max-w-3xl text-brand-50">{c.intro}</p>
        <a href="#enquire" className="mt-4 inline-block rounded-md bg-accent-500 px-5 py-2.5 font-bold text-white hover:bg-accent-600">Ask for fee &amp; next batch</a>
      </section>
      {!c.active && <p className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900">There is no open batch right now – send an enquiry and we’ll tell you when the next one starts.</p>}

      {facts.length > 0 && (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([icon, label, value]) => (
            <div key={label} className="rounded-md bg-white p-4 ring-1 ring-slate-200"><dt className="text-xs font-semibold uppercase text-slate-500">{icon} {label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
          ))}
        </dl>
      )}

      <h2 className="mt-8 text-xl font-bold">What you will learn</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {c.modules.map((m, i) => (
          <li key={m.title} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
            <p className="font-semibold"><span className="me-2 rounded bg-brand-600 px-2 py-0.5 text-xs text-white">{i + 1}</span>{m.title}</p>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">{m.topics.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-md bg-sky-50 p-5 ring-1 ring-sky-100">
        <h2 className="font-bold">Learn from a working repair bench</h2>
        <p className="mt-1 text-sm text-slate-700">PCBDukaan repairs industrial boards from factories every day – see our <Link href="/repair-case-studies" className="font-semibold text-brand-700 underline">repair case studies</Link>, free <Link href="/repair-guides" className="font-semibold text-brand-700 underline">repair guides</Link>, <Link href="/fault-codes" className="font-semibold text-brand-700 underline">VFD &amp; servo error codes</Link> and free <Link href="/pcb-design" className="font-semibold text-brand-700 underline">PCB design study material</Link>. Already a technician? Earn with us as a <Link href="/repair-partners" className="font-semibold text-brand-700 underline">repair partner</Link>.</p>
      </section>

      <h2 className="mt-8 text-xl font-bold">Questions</h2>
      <div className="mt-3 space-y-2">
        {c.faqs.map((f) => (
          <details key={f.q} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm text-slate-700">{withLinks(f.a)}</p>
          </details>
        ))}
      </div>

      <section id="enquire" className="mt-8 scroll-mt-24 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">Enquire about the course</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">We’ll call or WhatsApp you with the fee, dates and details.</p>
        <CourseEnquiryForm />
      </section>
    </div>
  );
}

export default function PcbRepairCoursePage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-5xl animate-pulse rounded-md bg-slate-100" />}>
      <Course />
    </Suspense>
  );
}
