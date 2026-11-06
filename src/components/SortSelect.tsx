"use client";

import { useRouter } from "@/i18n/client";

export function SortSelect({ options, value, label }: { options: { label: string; href: string; value: string }[]; value: string; label: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) router.push(opt.href);
        }}
        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
