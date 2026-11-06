"use client";

import { useRouter } from "next/navigation";

export function SortSelect({ options, value }: { options: { label: string; href: string; value: string }[]; value: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Sort by
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
