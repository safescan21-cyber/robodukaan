import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="RoboDukaan home">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white shadow-inner">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <rect x="5" y="8" width="14" height="11" rx="2" />
          <path strokeLinecap="round" d="M12 8V4M9 13h.01M15 13h.01M9.5 16.5h5M3 12v3M21 12v3" />
          <circle cx="12" cy="3.5" r="1" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-brand-800"}`}>
          Robo<span className="text-accent-500">Dukaan</span>
        </span>
        <span className={`hidden text-[10px] font-medium uppercase tracking-[0.18em] sm:block ${light ? "text-slate-400" : "text-slate-500"}`}>
          Robotics &amp; electronics
        </span>
      </span>
    </Link>
  );
}
