import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JobApplyForm } from "@/components/JobApplyForm";
import { formatDate } from "@/lib/format";
import { alternatesFor, getT } from "@/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import { SELLER, STORE } from "@/lib/constants";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
const EMPLOYMENT: Record<string, string> = { "full-time": "FULL_TIME", "part-time": "PART_TIME", contract: "CONTRACTOR", internship: "INTERN", temporary: "TEMPORARY" };

export async function generateMetadata(props: PageProps<"/[lang]/careers/[slug]">) {
  const { slug } = await props.params;
  const job = await getJob(slug);
  const { t } = await getT();
  return job
    ? { title: `${job.title} – ${t("nav.careers")}`, description: job.description.slice(0, 155), alternates: await alternatesFor(`/careers/${job.slug}`) }
    : { title: t("careers.notFound") };
}

export default function JobPage(props: PageProps<"/[lang]/careers/[slug]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <JobDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function JobDetail({ params }: Pick<PageProps<"/[lang]/careers/[slug]">, "params">) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const { t } = await getT();
  const reqs = (job.requirements ?? "").split("\n").map((r) => r.trim()).filter(Boolean);
  return (
    <>
      <Breadcrumbs items={[{ label: t("nav.careers"), href: "/careers" }, { label: job.title }]} />
      {job.is_open && (
        // Google for Jobs listing
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: [job.description, reqs.length ? `Requirements: ${reqs.join("; ")}` : ""].filter(Boolean).join("\n\n"),
          datePosted: job.created_at.slice(0, 10),
          employmentType: EMPLOYMENT[job.employment_type.toLowerCase()] ?? job.employment_type,
          hiringOrganization: { "@type": "Organization", name: SELLER.companyName || STORE.name, sameAs: SITE, logo: `${SITE}/logo-mark.svg` },
          jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "IN" } },
          ...(job.experience ? { experienceRequirements: job.experience } : {}),
          url: `${SITE}/careers/${job.slug}`,
        }} />
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article className="rounded-md bg-white p-6 ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[[t("careers.department"), job.department], [t("careers.location"), job.location], [t("careers.type"), job.employment_type], [t("jobs.experience"), job.experience], [t("careers.salary"), job.salary]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="rounded bg-slate-50 p-2.5"><dt className="text-xs uppercase text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
          </dl>
          <h2 className="mt-6 font-bold">{t("careers.aboutRole")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
          {reqs.length > 0 && (
            <>
              <h2 className="mt-6 font-bold">{t("careers.lookingFor")}</h2>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">{reqs.map((r) => <li key={r}>{r}</li>)}</ul>
            </>
          )}
          <p className="mt-6 text-xs text-slate-400">{t("careers.posted", { date: formatDate(job.created_at) })}</p>
        </article>
        <aside>
          <JobApplyForm jobId={job.id} jobTitle={job.title} slug={job.slug} />
        </aside>
      </div>
    </>
  );
}
