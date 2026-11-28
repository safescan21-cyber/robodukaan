"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import { MACHINES, TYPE_SHORT, fullName, type CncType } from "@/lib/cnc-machines";
import { MachineImage } from "@/components/MachineArt";

type Photos = Record<string, { url: string; credit?: string }>;

// Admin → CNC photos: a real photo for each machine in the CNC comparison (otherwise a drawing is shown).
export default function CncPhotosAdmin() {
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("site_content").select("value").eq("key", "cnc_photos").maybeSingle();
    if (error) setMsg({ ok: false, text: error.message });
    setPhotos((data?.value as Photos) ?? {});
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(next: Photos, text: string) {
    const { error } = await getSupabase().from("site_content").upsert({ key: "cnc_photos", value: next, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    setPhotos(next);
    revalidateCatalog();
    setMsg({ ok: true, text });
  }

  async function upload(slug: string, file: File, credit: string) {
    setBusy(slug); setMsg(null);
    try {
      const url = await uploadImage(file, "cnc");
      // re-read so two admins don't overwrite each other's photos
      const { data } = await getSupabase().from("site_content").select("value").eq("key", "cnc_photos").maybeSingle();
      await save({ ...((data?.value as Photos) ?? {}), [slug]: { url, ...(credit.trim() ? { credit: credit.trim().slice(0, 80) } : {}) } }, "Photo saved – it shows on the website within a minute.");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally { setBusy(null); }
  }

  async function remove(slug: string) {
    if (!confirm("Remove this photo? The drawing will be shown again.")) return;
    setBusy(slug);
    try {
      const { data } = await getSupabase().from("site_content").select("value").eq("key", "cnc_photos").maybeSingle();
      const next = { ...((data?.value as Photos) ?? {}) };
      delete next[slug];
      await save(next, "Photo removed.");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not remove" });
    } finally { setBusy(null); }
  }

  const list = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    return MACHINES.filter((m) => w.every((x) => `${fullName(m)} ${m.series} ${m.type}`.toLowerCase().includes(x)));
  }, [q]);

  if (!photos) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  const done = MACHINES.filter((m) => photos[m.slug]).length;
  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">CNC machine photos</h1>
      <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
        <p className="font-semibold">Use photos you are allowed to use</p>
        <p className="mt-1">Manufacturers&apos; website photos are copyrighted. Use your own photos, photos from a dealer, or images from the manufacturer&apos;s press / media kit (ask their marketing team – most allow it for dealers and service partners). Put who took the photo in “Credit” if they ask for it. Without a photo, a clean drawing of the machine type is shown.</p>
      </div>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search machine, e.g. BMV 50" className={`${adminField} max-w-sm`} />
        <p className="text-sm text-slate-600">{done} of {MACHINES.length} machines have a photo</p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
        {list.map((m) => (
          <Row key={m.slug} slug={m.slug} name={fullName(m)} type={m.type} tag={TYPE_SHORT[m.type as CncType]} photo={photos[m.slug]} busy={busy === m.slug} onUpload={upload} onRemove={remove} />
        ))}
      </ul>
    </div>
  );
}

function Row({ slug, name, type, tag, photo, busy, onUpload, onRemove }: {
  slug: string; name: string; type: string; tag: string; photo?: { url: string; credit?: string }; busy: boolean;
  onUpload: (slug: string, file: File, credit: string) => void; onRemove: (slug: string) => void;
}) {
  const [credit, setCredit] = useState(photo?.credit ?? "");
  return (
    <li className="flex flex-wrap items-center gap-4 p-3">
      <MachineImage type={type} photo={photo} alt={name} className="h-16 w-24 shrink-0 rounded-md ring-1 ring-slate-200" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{name} <span className="ms-1 rounded bg-slate-100 px-1.5 text-xs font-normal">{tag}</span></p>
        <a href={`/cnc-machines/${slug}`} target="_blank" className="text-xs text-brand-700 hover:underline">View page ↗</a>
      </div>
      <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Credit (optional)" maxLength={80} className="w-40 rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <label className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold text-white ${busy ? "bg-slate-400" : "bg-brand-600 hover:bg-brand-700"}`}>
        {busy ? "Saving…" : photo ? "Replace photo" : "Upload photo"}
        <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(slug, f, credit); e.target.value = ""; }} />
      </label>
      {photo && <button disabled={busy} onClick={() => onRemove(slug)} className="text-sm text-red-600 hover:underline">Remove</button>}
    </li>
  );
}
