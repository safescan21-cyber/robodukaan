"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import { cleanAuthor, cleanNote, noteKey, notePathOk, type AuthorInfo, type WorkshopNote } from "@/lib/expert";
import { DRIVE_BRANDS, codeSlug } from "@/lib/fault-codes";
import { PCB_LESSONS } from "@/lib/pcb-design";
import { REPAIR_GUIDES } from "@/lib/repair-guides";
import { REPAIR_BRANDS } from "@/lib/repair-brands";
import { REPAIR_SERVICES } from "@/lib/seo-content";
import { ELECTRICAL_FAULTS } from "@/lib/electrical-faults";

// Admin → Workshop notes: who writes/checks the guides, and your own experience on each page.
export default function WorkshopNotesAdmin() {
  const [author, setAuthor] = useState<AuthorInfo | null | undefined>(undefined);
  const [notes, setNotes] = useState<{ path: string; note: WorkshopNote }[]>([]);
  const [path, setPath] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pages = useMemo(() => [
    ...DRIVE_BRANDS.flatMap((b) => [{ p: `/fault-codes/${b.slug}`, l: `${b.brand} – all error codes` }, ...b.codes.map((c) => ({ p: `/fault-codes/${b.slug}/${codeSlug(c)}`, l: `${b.brand} ${c.code} – ${c.name}` }))]),
    ...REPAIR_SERVICES.map((s) => ({ p: `/pcb-repair/${s.slug}`, l: s.name })),
    ...REPAIR_BRANDS.map((b) => ({ p: `/pcb-repair/${b.service}/${b.slug}`, l: `${b.brand} ${b.noun} repair` })),
    ...REPAIR_GUIDES.map((g) => ({ p: `/repair-guides/${g.slug}`, l: `Guide: ${g.title}` })),
    ...PCB_LESSONS.map((x) => ({ p: `/pcb-design/${x.slug}`, l: `PCB design: ${x.h1}` })),
    ...ELECTRICAL_FAULTS.map((x) => ({ p: `/electrical-faults/${x.slug}`, l: `Electrical: ${x.h1}` })),
  ], []);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [a, n] = await Promise.all([
      sb.from("site_content").select("value").eq("key", "author").maybeSingle(),
      sb.from("site_content").select("key, value").like("key", "note:%").order("updated_at", { ascending: false }).limit(500),
    ]);
    if (a.error) setMsg({ ok: false, text: a.error.message });
    setAuthor(cleanAuthor(a.data?.value ?? null));
    setNotes(((n.data ?? []) as { key: string; value: unknown }[]).map((r) => ({ path: r.key.slice(5), note: cleanNote(r.value) })).filter((x): x is { path: string; note: WorkshopNote } => !!x.note));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function saveAuthor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let photoUrl = String(f.get("photoUrl") ?? "");
    const file = f.get("photo") as File | null;
    setBusy(true);
    try {
      if (file && file.size) photoUrl = await uploadImage(file, "people");
      const value = cleanAuthor({ name: f.get("name"), role: f.get("role"), experience: f.get("experience"), bio: f.get("bio"), photo: photoUrl });
      const sb = getSupabase();
      const { error } = value
        ? await sb.from("site_content").upsert({ key: "author", value, updated_at: new Date().toISOString() })
        : await sb.from("site_content").delete().eq("key", "author");
      if (error) throw new Error(error.message);
      revalidateCatalog();
      setMsg({ ok: true, text: value ? "Author saved – shown on guides and on the About page." : "Author removed." });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally { setBusy(false); }
  }

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const p = path.trim().replace(/^https?:\/\/[^/]+/, "").replace(/^\/(hi|ur|fr|ko|ja|zh|en)(?=\/)/, "").replace(/\/$/, "").toLowerCase();
    if (!notePathOk(p)) return setMsg({ ok: false, text: "Choose a page from the list (for example /fault-codes/delta/oc)." });
    const file = (e.currentTarget.elements.namedItem("notePhoto") as HTMLInputElement | null)?.files?.[0];
    setBusy(true);
    try {
      const photoUrl = file ? await uploadImage(file, "workshop") : photo;
      const value = cleanNote({ text, photo: photoUrl, updated: new Date().toISOString() });
      const sb = getSupabase();
      const { error } = value
        ? await sb.from("site_content").upsert({ key: noteKey(p), value, updated_at: new Date().toISOString() })
        : await sb.from("site_content").delete().eq("key", noteKey(p));
      if (error) throw new Error(error.message);
      revalidateCatalog();
      setMsg({ ok: true, text: value ? `Saved – shown on ${p} within a minute.` : `Note removed from ${p}.` });
      setPath(""); setText(""); setPhoto("");
      (e.target as HTMLFormElement).reset();
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally { setBusy(false); }
  }

  function edit(p: string, n: WorkshopNote) { setPath(p); setText(n.text); setPhoto(n.photo); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (author === undefined) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Workshop notes & author</h1>
      <div className="rounded-md bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
        <p className="font-semibold">What makes Google trust a page</p>
        <p className="mt-1">Google ranks pages that show <b>real first-hand experience</b> – who wrote it, and things only someone who does the work would know. Add a short note in your own words to the pages you know best: what you usually find on these boards, which part fails most, a real repair you did. A photo of a real board from your bench helps even more. Hindi-English mix is fine – write how you speak.</p>
      </div>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <form onSubmit={saveNote} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold">Add a workshop note to a page</h2>
        <label className="block text-sm font-medium">Page
          <input list="note-pages" value={path} onChange={(e) => setPath(e.target.value)} placeholder="Type a brand or code, e.g. delta oc" className={adminField} />
          <datalist id="note-pages">{pages.map((x) => <option key={x.p} value={x.p}>{x.l}</option>)}</datalist>
        </label>
        <label className="block text-sm font-medium">Your note
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={3000} className={adminField}
            placeholder="Example: In our workshop most Delta VFD-M drives with oc at start have a shorted IGBT in the U phase, and the gate resistor next to it is often open too. Always check the 10 Ω gate resistors before fitting a new IGBT…" />
        </label>
        <label className="block text-sm font-medium">Photo from your workshop (optional)
          <input type="file" name="notePhoto" accept="image/*" className="mt-1 block text-sm" />
          {photo && <span className="mt-1 block text-xs text-slate-500">Current photo kept unless you choose a new one. <button type="button" onClick={() => setPhoto("")} className="text-red-600 underline">Remove photo</button></span>}
        </label>
        <button disabled={busy} className={adminButton}>{busy ? "Saving…" : "Save note"}</button>
        <p className="text-xs text-slate-500">To remove a note, open it, clear the text and photo, and save.</p>
      </form>

      <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-2 font-semibold">Your notes ({notes.length})</h2>
        {notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet. Start with the pages people search most – see Search Console → Pages.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {notes.map(({ path: p, note }) => (
              <li key={p} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <a href={p} target="_blank" className="font-mono text-xs text-brand-700 hover:underline">{p}</a>
                  <p className="truncate text-slate-700">{note.text || "(photo only)"}</p>
                </div>
                <button onClick={() => edit(p, note)} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-slate-300">Edit</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={saveAuthor} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold">Author (who writes and checks the guides)</h2>
        <p className="text-xs text-slate-500">Shown as “Written and checked by …” on error codes, guides, PCB design lessons and repair pages, and on the About page. Use your real name and real experience.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Name<input name="name" defaultValue={author?.name ?? ""} placeholder="Sonu Giri" maxLength={80} className={adminField} /></label>
          <label className="block text-sm font-medium">Role<input name="role" defaultValue={author?.role ?? ""} placeholder="Founder & PCB repair technician" maxLength={120} className={adminField} /></label>
        </div>
        <label className="block text-sm font-medium">Experience<input name="experience" defaultValue={author?.experience ?? ""} placeholder="12 years repairing VFDs, SMPS and PLCs" maxLength={120} className={adminField} /></label>
        <label className="block text-sm font-medium">Short bio<textarea name="bio" defaultValue={author?.bio ?? ""} rows={3} maxLength={800} className={adminField} placeholder="Where you learned, what you repair most, which industries you work with…" /></label>
        <label className="block text-sm font-medium">Photo<input type="file" name="photo" accept="image/*" className="mt-1 block text-sm" /></label>
        <input type="hidden" name="photoUrl" defaultValue={author?.photo ?? ""} />
        {author?.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.photo} alt="" className="h-16 w-16 rounded-full object-cover" />
        )}
        <button disabled={busy} className={adminButton}>{busy ? "Saving…" : "Save author"}</button>
      </form>
    </div>
  );
}
