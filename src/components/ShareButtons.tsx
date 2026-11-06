"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

export function ShareButtons({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const { t, href } = useI18n();
  const url = () => `${window.location.origin}${href(path)}`;
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span>{t("share.label")}</span>
      <button
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${name} ${url()}`)}`, "_blank", "noopener")}
        className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        WhatsApp
      </button>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="rounded bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
      >
        {copied ? t("share.copied") : t("share.copy")}
      </button>
    </div>
  );
}
