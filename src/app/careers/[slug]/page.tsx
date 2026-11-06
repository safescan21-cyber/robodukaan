import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JobApplyForm } from "@/components/JobApplyForm";
import { formatDate } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/careers/[slug]">) {
  const { slug } = await props.params;
  const job = await getJob(slug);
  return job ? { title: `${job.title} – Careers`, description: job.description.slice(0, 155) } : { title: "Job not found" };
}

export default function JobPage(props: PageProps<"/careers/[slug]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
        <JobDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function JobDetail({ params }: Pick<PageProps<"/careers/[slug]">, "params">) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const reqs = (job.requirements ?? "").split("\n").map((r) => r.trim()).filter(Boolean);
  return (
    <>
      <Breadcrumbs items={[{ label: "Careers", href: "/careers" }, { label: job.title }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article className="rounded-md bg-white p-6 ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[["Department", job.department], ["Location", job.location], ["Type", job.employment_type], ["Experience", job.experience], ["Salary", job.salary]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="rounded bg-slate-50 p-2.5"><dt className="text-xs uppercase text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
          </dl>
          <h2 className="mt-6 font-bold">About the role</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
          {reqs.length > 0 && (
            <>
              <h2 className="mt-6 font-bold">What we’re looking for</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{reqs.map((r) => <li key={r}>{r}</li>)}</ul>
            </>
          )}
          <p className="mt-6 text-xs text-slate-400">Posted {formatDate(job.created_at)}</p>
        </article>
        <aside>
          <JobApplyForm jobId={job.id} jobTitle={job.title} slug={job.slug} />
        </aside>
      </div>
    </>
  );
}
