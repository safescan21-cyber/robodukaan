"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField, revalidateCatalog, uploadImage } from "@/lib/admin";
import { MACHINES, TYPE_SHORT, fullName, type CncType } from "@/lib/cnc-machines";
import { FREE_CNC_PHOTOS } from "@/lib/cnc-photos-free";
import { MachineImage, type MachinePhoto } from "@/components/MachineArt";

type Photos = Record<string, { url: string; credit?: string }>;
type Settings = { enabled: boolean; hidden: string[]; hiddenPhotos: string[] };
const DEFAULT: Settings = { enabled: true, hidden: [], hiddenPhotos: [] };

const readSettings = (v: unknown): Settings => {
  const x = (v ?? {}) as Partial<Settings>;
  return { enabled: x.enabled !== false, hidden: Array.isArray(x.hidden) ? x.hidden : [], hiddenPhotos: Array.isArray(x.hiddenPhotos) ? x.hiddenPhotos : [] };
};

// Admin → CNC comparison: show / hide the whole section, single machines or single photos, and upload photos.
export default function CncAdmin() {
  const [photos, setPhotos] = useState<Photos | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"" | "hidden" | "photo">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("site_content").select("key, value").in("key", ["cnc_photos", "cnc_settings"]);
    if (error) setMsg({ ok: false, text: error.message });
    const row = (k: string) => data?.find((r) => r.key === k)?.value;
    setPhotos((row("cnc_photos") as Photos) ?? {});
    setSettings(readSettings(row("cnc_settings")));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  // Always start from the saved value, so two admins don't undo each other's changes.
  async function changeSettings(change: (s: Settings) => Settings, text: string, key: string) {
    setBusy(key); setMsg(null);
    try {
      const sb = getSupabase();
      const { data } = await sb.from("site_content").select("value").eq("key", "cnc_settings").maybeSingle();
      const next = change(readSettings(data?.value));
      const { error } = await sb.from("site_content").upsert({ key: "cnc_settings", value: next, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      setSettings(next);
      revalidateCatalog();
      setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally { setBusy(null); }
  }
  const toggle = (list: string[], slug: string, on: boolean) => (on ? [...new Set([...list, slug])] : list.filter((s) => s !== slug));

  async function savePhotos(change: (p: Photos) => Photos, text: string, slug: string) {
    setBusy(slug); setMsg(null);
    try {
      const sb = getSupabase();
      const { data } = await sb.from("site_content").select("value").eq("key", "cnc_photos").maybeSingle();
      const next = change((data?.value as Photos) ?? {});
      const { error } = await sb.from("site_content").upsert({ key: "cnc_photos", value: next, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      setPhotos(next);
      revalidateCatalog();
      setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally { setBusy(null); }
  }

  async function upload(slug: string, file: File, credit: string) {
    setBusy(slug);
    try {
      const url = await uploadImage(file, "cnc");
      await savePhotos((p) => ({ ...p, [slug]: { url, ...(credit.trim() ? { credit: credit.trim().slice(0, 80) } : {}) } }), "Photo saved – it shows on the website within a minute.", slug);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
      setBusy(null);
    }
  }

  const list = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    return MACHINES.filter((m) => w.every((x) => `${fullName(m)} ${m.series} ${m.type}`.toLowerCase().includes(x)))
      .filter((m) => only !== "hidden" || settings.hidden.includes(m.slug))
      .filter((m) => only !== "photo" || photos?.[m.slug] || FREE_CNC_PHOTOS[m.slug]);
  }, [q, only, settings.hidden, photos]);

  if (!photos) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  const withPhoto = MACHINES.filter((m) => photos[m.slug] || FREE_CNC_PHOTOS[m.slug]).length;
  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">CNC comparison</h1>

      <section className={`flex flex-wrap items-center justify-between gap-4 rounded-md p-5 ring-1 ${settings.enabled ? "bg-emerald-50 ring-emerald-200" : "bg-slate-100 ring-slate-300"}`}>
        <div>
          <p className="text-lg font-bold">{settings.enabled ? "✅ CNC comparison is ON" : "⛔ CNC comparison is HIDDEN"}</p>
          <p className="text-sm text-slate-600">{settings.enabled
            ? <>Visitors see it at <a href="/cnc-machines" target="_blank" className="font-semibold text-brand-700 underline">pcbdukaan.com/cnc-machines</a> and in the menu.</>
            : "The pages, menu links and sitemap entries are hidden from everyone. Turn it on again any time."}</p>
        </div>
        <button disabled={busy === "all"} onClick={() => changeSettings((s) => ({ ...s, enabled: !s.enabled }), settings.enabled ? "CNC comparison hidden – gone from the website within a minute." : "CNC comparison is live again.", "all")}
          className={`rounded-md px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${settings.enabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
          {busy === "all" ? "Saving…" : settings.enabled ? "Hide CNC comparison" : "Show CNC comparison"}
        </button>
      </section>

      <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
        <p className="font-semibold">Photos: only ones you are allowed to use</p>
        <p className="mt-1">Manufacturers&apos; website photos are copyrighted. Use your own photos, dealer photos or the manufacturer&apos;s press photos with their permission, and put the credit they ask for. Without a photo, a drawing of the machine type is shown.</p>
      </div>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search machine, e.g. BMV 50" className={`${adminField} max-w-xs`} />
        <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} className="rounded border border-slate-300 px-2 py-2 text-sm">
          <option value="">All machines</option><option value="hidden">Hidden machines</option><option value="photo">With photo</option>
        </select>
        <p className="text-sm text-slate-600">{MACHINES.length - settings.hidden.length} of {MACHINES.length} shown · {withPhoto} with photo</p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
        {list.map((m) => {
          const hidden = settings.hidden.includes(m.slug);
          const photoHidden = settings.hiddenPhotos.includes(m.slug);
          const photo: MachinePhoto | undefined = photos[m.slug] ?? FREE_CNC_PHOTOS[m.slug];
          return (
            <Row key={m.slug} slug={m.slug} name={fullName(m)} type={m.type} tag={TYPE_SHORT[m.type as CncType]}
              photo={photo} uploaded={!!photos[m.slug]} hidden={hidden} photoHidden={photoHidden} busy={busy === m.slug}
              onUpload={upload}
              onRemove={(slug) => confirm("Remove this uploaded photo?") && savePhotos((p) => { const n = { ...p }; delete n[slug]; return n; }, "Photo removed.", slug)}
              onHide={(slug, on) => changeSettings((s) => ({ ...s, hidden: toggle(s.hidden, slug, on) }), on ? "Machine hidden from the website." : "Machine shown again.", slug)}
              onHidePhoto={(slug, on) => changeSettings((s) => ({ ...s, hiddenPhotos: toggle(s.hiddenPhotos, slug, on) }), on ? "Photo hidden – the drawing is shown instead." : "Photo shown again.", slug)} />
          );
        })}
      </ul>
    </div>
  );
}

function Row({ slug, name, type, tag, photo, uploaded, hidden, photoHidden, busy, onUpload, onRemove, onHide, onHidePhoto }: {
  slug: string; name: string; type: string; tag: string; photo?: MachinePhoto; uploaded: boolean; hidden: boolean; photoHidden: boolean; busy: boolean;
  onUpload: (slug: string, file: File, credit: string) => void; onRemove: (slug: string) => void;
  onHide: (slug: string, on: boolean) => void; onHidePhoto: (slug: string, on: boolean) => void;
}) {
  const [credit, setCredit] = useState(photo?.credit ?? "");
  return (
    <li className={`flex flex-wrap items-center gap-3 p-3 ${hidden ? "bg-slate-50 opacity-70" : ""}`}>
      <MachineImage type={type} photo={photoHidden ? null : photo} alt={name} className="h-16 w-24 shrink-0 rounded-md ring-1 ring-slate-200" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{name} <span className="ms-1 rounded bg-slate-100 px-1.5 text-xs font-normal">{tag}</span>
          {hidden && <span className="ms-1 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-700">Hidden</span>}</p>
        <p className="text-xs text-slate-500">
          {photo ? (uploaded ? "Your photo" : `Free-licence photo (${photo.license})`) : "Drawing (no photo)"}{photoHidden && photo ? " · photo hidden" : ""}
          {" · "}<a href={`/cnc-machines/${slug}`} target="_blank" className="text-brand-700 hover:underline">View ↗</a>
        </p>
      </div>
      <button disabled={busy} onClick={() => onHide(slug, !hidden)}
        className={`rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ${hidden ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-slate-300 hover:ring-red-400"}`}>
        {hidden ? "Show machine" : "Hide machine"}
      </button>
      {photo && (
        <button disabled={busy} onClick={() => onHidePhoto(slug, !photoHidden)} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:ring-amber-400">
          {photoHidden ? "Show photo" : "Hide photo"}
        </button>
      )}
      <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Photo credit" maxLength={80} className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <label className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold text-white ${busy ? "bg-slate-400" : "bg-brand-600 hover:bg-brand-700"}`}>
        {busy ? "Saving…" : uploaded ? "Replace photo" : "Upload photo"}
        <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(slug, f, credit); e.target.value = ""; }} />
      </label>
      {uploaded && <button disabled={busy} onClick={() => onRemove(slug)} className="text-sm text-red-600 hover:underline">Remove</button>}
    </li>
  );
}
