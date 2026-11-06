"use client";

import { useState } from "react";

export function ShareButtons({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span>Share:</span>
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
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
