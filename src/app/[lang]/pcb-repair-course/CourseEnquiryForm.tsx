"use client";

import { useState } from "react";

// Enquiry form on the course page (no login needed).
export function CourseEnquiryForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    setBusy(true); setMsg(null);
    const res = await fetch("/api/course-enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const r = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { form.reset(); setMsg({ ok: true, text: "Thank you! We'll call you soon with the fee, dates and details." }); }
    else setMsg({ ok: false, text: r.error || "Could not send – please try again." });
  }
  const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Your name *<input name="name" required minLength={2} maxLength={100} autoComplete="name" className={field} /></label>
      <label className="text-sm font-medium">Mobile (WhatsApp) *<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={field} /></label>
      <label className="text-sm font-medium">Email<input name="email" type="email" maxLength={200} autoComplete="email" className={field} /></label>
      <label className="text-sm font-medium">City<input name="city" maxLength={80} autoComplete="address-level2" className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">Your background
        <select name="level" className={field} defaultValue="">
          <option value="">Choose…</option>
          <option>Student (ITI / diploma / engineering)</option>
          <option>Maintenance electrician / technician</option>
          <option>Repair shop owner</option>
          <option>Engineer / other</option>
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">Question or message<textarea name="message" rows={3} maxLength={1000} placeholder="e.g. Which boards will I practise on? Weekend batch possible?" className={field} /></label>
      <div className="sm:col-span-2">
        <button disabled={busy} className="rounded-md bg-accent-500 px-6 py-3 font-bold text-white hover:bg-accent-600 disabled:opacity-60">{busy ? "Sending…" : "Send enquiry"}</button>
        {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
