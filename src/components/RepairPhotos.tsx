"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n } from "@/i18n/client";

// Repair photos are private: show them through short-lived signed links.
export function RepairPhotos({ paths, size = "md" }: { paths: string[]; size?: "sm" | "md" }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const { t } = useI18n();

  useEffect(() => {
    if (!paths.length) return;
    getSupabase()
      .storage.from("pcb-repairs")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach((d) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
        setUrls(map);
      });
  }, [paths]);

  if (!paths.length) return <p className="text-sm text-slate-500">{t("repair.noPhotos")}</p>;
  const box = size === "sm" ? "h-14 w-14" : "h-28 w-28";
  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((p) =>
        urls[p] ? (
          <a key={p} href={urls[p]} target="_blank" rel="noopener noreferrer" className={`${box} overflow-hidden rounded border border-slate-200 bg-slate-50`} title={t("repair.openFull")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[p]} alt={t("repair.photoAlt")} className="h-full w-full object-cover" />
          </a>
        ) : (
          <span key={p} className={`${box} animate-pulse rounded bg-slate-100`} />
        ),
      )}
    </div>
  );
}
