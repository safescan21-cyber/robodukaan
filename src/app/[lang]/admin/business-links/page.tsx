"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { BUSINESS_SITES, cleanBusinessLinks, type BusinessLinks } from "@/lib/business-links";

// Admin → Business links: your profiles on Google Business, IndiaMART, Justdial, social media …
export default function BusinessLinksAdmin() {
  const [links, setLinks] = useState<BusinessLinks | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("site_content").select("value").eq("key", "business_links").maybeSingle();
    if (error) setMsg({ ok: false, text: error.message });
    setLinks(cleanBusinessLinks(data?.value ?? null));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const raw = Object.fromEntries(BUSINESS_SITES.map((s) => [s.key, String(f.get(s.key) ?? "").trim()]));
    const value = cleanBusinessLinks(raw);
    const bad = BUSINESS_SITES.filter((s) => raw[s.key] && !value[s.key]).map((s) => s.label);
    if (bad.length) return setMsg({ ok: false, text: `Please check: ${bad.join(", ")} – paste the full https:// link of your page on that website.` });
    const { error } = await getSupabase().from("site_content").upsert({ key: "business_links", value, updated_at: new Date().toISOString() });
    if (error) return setMsg({ ok: false, text: error.message });
    revalidateCatalog();
    setMsg({ ok: true, text: "Saved – the links appear in the website footer within a minute." });
    load();
  }

  if (!links) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Business links</h1>
      <div className="rounded-md bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
        <p className="font-semibold">Why this matters</p>
        <p className="mt-1">Google trusts a new website more when the same business is found on other well-known sites. Create your free profiles, put <b>https://pcbdukaan.com</b> as the website in each one, then paste the profile links here. They are shown in the footer and told to Google as “the same business”.</p>
      </div>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <form onSubmit={save} className="space-y-4 rounded-md bg-white p-4 ring-1 ring-slate-200">
        {BUSINESS_SITES.map((s) => (
          <label key={s.key} className="block text-sm font-medium">{s.label}
            <input name={s.key} type="url" defaultValue={links[s.key] ?? ""} placeholder={s.ph} maxLength={300} className={adminField} />
          </label>
        ))}
        <button className={adminButton}>Save</button>
      </form>
    </div>
  );
}
