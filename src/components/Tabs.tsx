"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="rounded-md bg-white ring-1 ring-slate-200">
      <div className="flex overflow-x-auto border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-semibold uppercase tracking-wide ${
              active === t.id ? "border-accent-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id} className="p-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
