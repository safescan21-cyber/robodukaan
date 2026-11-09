import Link from "@/i18n/client";
import { getT } from "@/i18n/server";

export async function Logo({ light = false }: { light?: boolean }) {
  const { t } = await getT();
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={t("logo.home")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={44} height={44} className={`h-11 w-11 shrink-0 ${light ? "rounded-lg bg-white p-1" : ""}`} />
      <span className="leading-none">
        <span className={`block text-lg font-extrabold tracking-tight sm:text-xl ${light ? "text-white" : "text-brand-800"}`}>
          PCB<span className={light ? "text-accent-500" : "text-accent-700"}>Dukaan</span>
        </span>
        <span className={`hidden text-[10px] font-medium uppercase tracking-[0.18em] sm:block ${light ? "text-slate-400" : "text-slate-500"}`}>
          {t("logo.tagline")}
        </span>
      </span>
    </Link>
  );
}
