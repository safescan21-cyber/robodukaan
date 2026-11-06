"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { formatDate, slugify } from "@/lib/format";
import type { Job } from "@/lib/types";

type Row = Job & { job_applications: { count: number }[] };

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Job | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("jobs").select("*, job_applications(count)").order("created_at", { ascending: false });
    if (error) setError(error.message.includes("does not exist") ? "Jobs aren't set up in the database yet — run supabase/migrations/005_jobs_and_blocking.sql in the Supabase SQL Editor." : error.message);
    setJobs((data as Row[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => String(f.get(k) ?? "").trim() || null;
    const title = String(f.get("title")).trim();
    const values = {
      title,
      slug: slugify(opt("slug") ?? title),
      department: opt("department"),
      location: opt("location") ?? "India",
      employment_type: String(f.get("employment_type")),
      experience: opt("experience"),
      salary: opt("salary"),
      description: String(f.get("description")).trim(),
      requirements: opt("requirements"),
      is_open: f.get("is_open") === "on",
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const supabase = getSupabase();
    const { error } = editing && editing !== "new"
      ? await supabase.from("jobs").update(values).eq("id", editing.id)
      : await supabase.from("jobs").insert(values);
    setSaving(false);
    if (error) return setError(error.message.includes("duplicate") ? "Another job already uses this URL slug." : error.message);
    setError(null);
    setEditing(null);
    revalidateCatalog();
    load();
  }

  async function toggle(j: Job) {
    await getSupabase().from("jobs").update({ is_open: !j.is_open, updated_at: new Date().toISOString() }).eq("id", j.id);
    revalidateCatalog();
    load();
  }

  async function remove(j: Row) {
    const n = j.job_applications?.[0]?.count ?? 0;
    if (!confirm(`Delete “${j.title}”${n ? ` and its ${n} application(s)` : ""}? To keep applications, close the job instead.`)) return;
    await getSupabase().from("jobs").delete().eq("id", j.id);
    revalidateCatalog();
    load();
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex gap-2">
          <a href="/careers" target="_blank" className="rounded-md px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-600 hover:bg-brand-50">View careers page</a>
          {editing === null && <button onClick={() => setEditing("new")} className={adminButton}>+ Post a job</button>}
        </div>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {editing !== null && (
        <form key={current?.id ?? "new"} onSubmit={save} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Job title *<input name="title" required defaultValue={current?.title} placeholder="e.g. PCB Repair Technician" className={adminField} /></label>
          <label className="text-sm font-medium">Department<input name="department" defaultValue={current?.department ?? ""} placeholder="Service / Sales / Accounts" className={adminField} /></label>
          <label className="text-sm font-medium">Location<input name="location" defaultValue={current?.location ?? "India"} className={adminField} /></label>
          <label className="text-sm font-medium">Job type
            <select name="employment_type" defaultValue={current?.employment_type ?? "Full-time"} className={adminField}>
              {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Experience<input name="experience" defaultValue={current?.experience ?? ""} placeholder="e.g. 2+ years" className={adminField} /></label>
          <label className="text-sm font-medium">Salary (optional)<input name="salary" defaultValue={current?.salary ?? ""} placeholder="e.g. ₹20,000–30,000 / month" className={adminField} /></label>
          <label className="text-sm font-medium">URL slug<input name="slug" defaultValue={current?.slug ?? ""} placeholder="auto from title" className={adminField} /></label>
          <label className="text-sm font-medium sm:col-span-2">Job description *<textarea name="description" required rows={5} defaultValue={current?.description} className={adminField} /></label>
          <label className="text-sm font-medium sm:col-span-2">Requirements (one per line)<textarea name="requirements" rows={4} defaultValue={current?.requirements ?? ""} className={adminField} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_open" defaultChecked={current?.is_open ?? true} className="h-4 w-4 accent-brand-600" />Open — show on the careers page</label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saving} className={adminButton}>{saving ? "Saving…" : current ? "Save job" : "Post job"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Posted</th><th className="px-4 py-3">Applications</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs === null && <tr><td colSpan={5} className="p-4 text-slate-500">Loading…</td></tr>}
            {jobs?.length === 0 && <tr><td colSpan={5} className="p-4 text-slate-500">No jobs yet. Click “Post a job”.</td></tr>}
            {jobs?.map((j) => (
              <tr key={j.id} className={j.is_open ? "" : "bg-slate-50 text-slate-500"}>
                <td className="px-4 py-3"><Link href={`/admin/jobs/${j.id}`} className="font-semibold text-brand-700 hover:underline">{j.title}</Link><span className="block text-xs text-slate-500">{[j.department, j.location, j.employment_type].filter(Boolean).join(" · ")}</span></td>
                <td className="px-4 py-3">{formatDate(j.created_at)}</td>
                <td className="px-4 py-3"><Link href={`/admin/jobs/${j.id}`} className="font-semibold hover:underline">{j.job_applications?.[0]?.count ?? 0}</Link></td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(j)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${j.is_open ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`} title="Click to open/close">
                    {j.is_open ? "Open" : "Closed"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold">
                  <button onClick={() => setEditing(j)} className="text-brand-700 hover:underline">Edit</button>
                  <button onClick={() => remove(j)} className="ml-3 text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
