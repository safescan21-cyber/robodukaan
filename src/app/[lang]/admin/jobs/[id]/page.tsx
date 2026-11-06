"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_STYLE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Job, JobApplication, JobApplicationStatus } from "@/lib/types";

const STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as JobApplicationStatus[];

function JobApplications() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<JobApplicationStatus | "">("");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [j, a] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
      supabase.from("job_applications").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    ]);
    setJob((j.data as Job) ?? null);
    setApps((a.data as JobApplication[]) ?? []);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function setStatus(a: JobApplication, status: JobApplicationStatus) {
    setApps((cur) => cur.map((x) => (x.id === a.id ? { ...x, status } : x)));
    await getSupabase().from("job_applications").update({ status }).eq("id", a.id);
  }

  async function saveNotes(a: JobApplication, admin_notes: string) {
    if ((a.admin_notes ?? "") === admin_notes) return;
    await getSupabase().from("job_applications").update({ admin_notes: admin_notes || null }).eq("id", a.id);
    load();
  }

  async function openCv(path: string) {
    const { data, error } = await getSupabase().storage.from("resumes").createSignedUrl(path, 60 * 10);
    if (error || !data) return alert(error?.message ?? "Could not open the CV");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (job === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (job === null) return <p>Job not found. <Link href="/admin/jobs" className="text-brand-700 underline">Back</Link></p>;
  const shown = filter ? apps.filter((a) => a.status === filter) : apps;

  return (
    <div className="space-y-5">
      <Link href="/admin/jobs" className="text-sm font-semibold text-brand-700 hover:underline">← Jobs</Link>
      <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <p className="text-sm text-slate-600">{[job.department, job.location, job.employment_type, job.is_open ? "Open" : "Closed"].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[["", `All (${apps.length})`] as const, ...STATUSES.map((s) => [s, `${APPLICATION_STATUS_LABEL[s]} (${apps.filter((a) => a.status === s).length})`] as const)].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1 text-sm ring-1 ${filter === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}>{label}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-md bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200">No applications{filter ? " with this status" : " yet"}.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => {
            const phone = a.phone.replace(/\D/g, "").slice(-10);
            return (
              <li key={a.id} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{a.name}</p>
                    <p className="text-sm text-slate-600">✉️ <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a> · 📞 {a.phone}{a.experience ? ` · ${a.experience}` : ""}</p>
                    <p className="text-xs text-slate-400">Applied {formatDate(a.created_at)}</p>
                  </div>
                  <select value={a.status} onChange={(e) => setStatus(a, e.target.value as JobApplicationStatus)} className={`rounded-full px-3 py-1 text-xs font-semibold ${APPLICATION_STATUS_STYLE[a.status]}`} aria-label="Application status">
                    {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                {a.message && <p className="mt-3 whitespace-pre-line rounded bg-slate-50 p-3 text-sm text-slate-700">{a.message}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {a.resume_path ? <button onClick={() => openCv(a.resume_path!)} className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">📄 Open CV</button> : <span className="rounded-md bg-slate-100 px-3 py-1.5 text-slate-500">No CV uploaded</span>}
                  {phone && <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">WhatsApp</a>}
                  {phone && <a href={`tel:+91${phone}`} className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">Call</a>}
                </div>
                <label className="mt-3 block text-xs font-medium text-slate-500">Private notes
                  <textarea defaultValue={a.admin_notes ?? ""} onBlur={(e) => saveNotes(a, e.target.value.trim())} rows={2} placeholder="Interview notes (only admins see this)" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600" />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <JobApplications />
    </Suspense>
  );
}
