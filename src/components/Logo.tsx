import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="RoboDukaan home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={44} height={44} className={`h-11 w-11 shrink-0 ${light ? "rounded-lg bg-white p-1" : ""}`} />
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
