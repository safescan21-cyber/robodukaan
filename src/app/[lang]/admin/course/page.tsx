"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { DEFAULT_COURSE, mergeCourse, type CourseInfo } from "@/lib/course";

type Enquiry = { id: number; name: string; phone: string; email: string | null; city: string | null; level: string | null; message: string | null; status: string; created_at: string };
const STATUSES = ["new", "contacted", "joined", "closed"];

const modulesToText = (c: CourseInfo) => c.modules.map((m) => `${m.title}: ${m.topics.join("; ")}`).join("\n");
const faqsToText = (c: CourseInfo) => c.faqs.map((f) => `${f.q} | ${f.a}`).join("\n");

// Admin → Repair course: the course page details (pcbdukaan.com/pcb-repair-course) and the enquiries.
export default function CourseAdmin() {
  const [c, setC] = useState<CourseInfo | null>(null);
  const [enq, setEnq] = useState<Enquiry[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [{ data, error }, e] = await Promise.all([
      sb.from("site_content").select("value").eq("key", "course").maybeSingle(),
      sb.from("course_enquiries").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) setMsg({ ok: false, text: error.message.includes("site_content") ? "Database update 028 is needed first (it installs itself within a few minutes)." : error.message });
    setC(mergeCourse((data?.value as Partial<CourseInfo>) ?? null));
    setEnq((e.data as Enquiry[]) ?? []);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const modules = s("modules").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [title, ...rest] = l.split(":");
      return { title: title.trim(), topics: rest.join(":").split(";").map((x) => x.trim()).filter(Boolean) };
    }).filter((m) => m.title);
    const faqs = s("faqs").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [q, ...a] = l.split("|");
      return { q: q.trim(), a: a.join("|").trim() };
    }).filter((x) => x.q && x.a);
    const value: CourseInfo = {
      active: f.get("active") === "on", title: s("title") || DEFAULT_COURSE.title, intro: s("intro") || DEFAULT_COURSE.intro,
      mode: s("mode"), duration: s("duration"), fee: s("fee"), language: s("language"), location: s("location"), nextBatch: s("nextBatch"), certificate: s("certificate"),
      modules: modules.length ? modules : DEFAULT_COURSE.modules, faqs: faqs.length ? faqs : DEFAULT_COURSE.faqs,
    };
    const { error } = await getSupabase().from("site_content").upsert({ key: "course", value, updated_at: new Date().toISOString() });
    if (error) return setMsg({ ok: false, text: error.message });
    revalidateCatalog();
    setMsg({ ok: true, text: "Saved – the course page shows it within a minute." });
    load();
  }

  async function setStatus(id: number, status: string) {
    await getSupabase().from("course_enquiries").update({ status }).eq("id", id);
    load();
  }

  if (!c) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  const text = (name: keyof CourseInfo, label: string, ph: string) => (
    <label className="block text-sm font-medium">{label}<input name={name} defaultValue={String(c[name] ?? "")} placeholder={ph} maxLength={120} className={adminField} /></label>
  );
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">PCB repair course</h1>
      <p className="text-sm text-slate-600">The page <a href="/pcb-repair-course" target="_blank" className="font-semibold text-brand-700 underline">pcbdukaan.com/pcb-repair-course</a> shows up in Google for searches like “PCB repair course” and “VFD repair training”. Fill in your real details – empty fields are not shown.</p>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold">Enquiries ({enq.filter((x) => x.status === "new").length} new)</h2>
        {enq.length === 0 ? <p className="text-sm text-slate-500">No enquiries yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {enq.map((x) => (
              <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{x.name}{x.city ? ` · ${x.city}` : ""} <span className="font-normal text-slate-500">· {new Date(x.created_at).toLocaleString("en-IN")}</span></p>
                  <p className="text-slate-600">{[x.level, x.email].filter(Boolean).join(" · ")}</p>
                  {x.message && <p className="mt-1 text-slate-700">{x.message}</p>}
                  <div className="mt-1 flex gap-3"><a href={`tel:+91${x.phone}`} className="font-semibold text-brand-700">📞 +91 {x.phone}</a><a href={`https://wa.me/91${x.phone}?text=${encodeURIComponent(`Hello ${x.name}, thank you for your enquiry about the PCBDukaan PCB repair course.`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700">WhatsApp</a></div>
                </div>
                <select value={x.status} onChange={(e) => setStatus(x.id, e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={save} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200" key={JSON.stringify(c).length}>
        <h2 className="font-semibold">Course page</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} className="h-4 w-4 accent-brand-600" />Taking enquiries for a batch (untick to show “no open batch right now”)</label>
        {text("title", "Title", DEFAULT_COURSE.title)}
        <label className="block text-sm font-medium">Introduction<textarea name="intro" defaultValue={c.intro} rows={3} maxLength={600} className={adminField} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("mode", "Mode", "e.g. Classroom, hands-on / Online + practical")}
          {text("duration", "Duration", "e.g. 6 weeks, 3 days a week")}
          {text("fee", "Fee", "e.g. ₹15,000 incl. GST")}
          {text("language", "Language", "e.g. Hindi & English")}
          {text("location", "Location", "e.g. Ahmedabad")}
          {text("nextBatch", "Next batch", "e.g. 1 December 2026")}
          {text("certificate", "Certificate", "e.g. Certificate after the practical test")}
        </div>
        <label className="block text-sm font-medium">Syllabus <span className="font-normal text-slate-500">(one module per line – “Module name: topic; topic; topic”)</span><textarea name="modules" defaultValue={modulesToText(c)} rows={10} className={`${adminField} font-mono text-xs`} /></label>
        <label className="block text-sm font-medium">Questions <span className="font-normal text-slate-500">(one per line – “Question | Answer”)</span><textarea name="faqs" defaultValue={faqsToText(c)} rows={6} className={`${adminField} font-mono text-xs`} /></label>
        <button className={adminButton}>Save</button>
      </form>
    </div>
  );
}
