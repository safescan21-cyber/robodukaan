"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

const THEMES: Record<Banner["theme"], string> = {
  blue: "from-brand-800 via-brand-700 to-brand-600",
  orange: "from-accent-600 via-accent-500 to-amber-400",
  dark: "from-slate-900 via-slate-800 to-brand-900",
  green: "from-emerald-800 via-emerald-700 to-teal-600",
};
const ICONS = ["pcb", "power", "scale", "chip", "motor"];

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const go = (n: number) => setIndex((n + count) % count);

  return (
    <div
      className="relative h-56 overflow-hidden rounded-md sm:h-72 lg:h-[340px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={i !== index}
        >
          {b.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${THEMES[b.theme]}`}>
              <div className="absolute -right-10 top-1/2 hidden -translate-y-1/2 opacity-90 sm:block">
                <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 lg:h-96 lg:w-96">
                  <CategoryIcon name={ICONS[i % ICONS.length]} className="h-36 w-36 text-white/80 lg:h-48 lg:w-48" />
                </div>
              </div>
            </div>
          )}
          <div className={`relative flex h-full max-w-xl flex-col justify-center px-6 sm:px-16 ${b.image_url ? "bg-gradient-to-r from-black/60 to-transparent" : ""}`}>
            <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">{b.title}</h2>
            {b.subtitle && <p className="mt-3 text-sm text-white/85 sm:text-lg">{b.subtitle}</p>}
            <Link
              href={b.link}
              tabIndex={i === index ? 0 : -1}
              className="mt-6 inline-block w-fit rounded-md bg-white px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 shadow hover:bg-accent-500 hover:text-white"
            >
              {b.cta_label || "Shop now"}
            </Link>
          </div>
        </div>
      ))}
      {count > 1 && (
        <>
          <button onClick={() => go(index - 1)} className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-slate-800 shadow hover:bg-white sm:flex" aria-label="Previous slide">‹</button>
          <button onClick={() => go(index + 1)} className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-slate-800 shadow hover:bg-white sm:flex" aria-label="Next slide">›</button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-white" : "w-2.5 bg-white/50"}`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
