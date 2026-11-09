"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "./ProductImage";
import { useI18n } from "@/i18n/client";

type Item = { kind: "image"; src: string | null } | { kind: "video"; src: string };

// Product photos + videos: swipe on phones (scroll-snap), arrows, dots, thumbnails, keyboard keys,
// and a full-screen view with zoom (tap / double-click / pinch on phones).
export function ProductGallery({ images, videos = [], icon, name }: { images: string[]; videos?: string[]; icon: string; name: string }) {
  const items: Item[] = [
    ...(images.length ? images.map((src) => ({ kind: "image" as const, src })) : videos.length ? [] : [{ kind: "image" as const, src: null }]),
    ...videos.map((src) => ({ kind: "video" as const, src })),
  ];
  const { t, dir } = useI18n();
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const many = items.length > 1;

  const go = useCallback((i: number, smooth = true) => {
    const el = track.current;
    const n = Math.max(0, Math.min(items.length - 1, i));
    if (el) el.scrollTo({ left: n * el.clientWidth * (dir === "rtl" ? -1 : 1), behavior: smooth ? "smooth" : "auto" });
    setActive(n);
  }, [items.length, dir]);

  // Keep the active dot/thumbnail in sync while the customer swipes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setActive(Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Keep the active thumbnail in view (without moving the page).
  useEffect(() => {
    const box = thumbs.current;
    const el = box?.children[active] as HTMLElement | undefined;
    if (!box || !el) return;
    const vertical = box.scrollHeight > box.clientHeight + 1;
    if (vertical) box.scrollTo({ top: el.offsetTop - (box.clientHeight - el.offsetHeight) / 2, behavior: "smooth" });
    else box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  // Pause videos that are swiped away.
  useEffect(() => {
    track.current?.querySelectorAll("video").forEach((v) => { if (Number(v.dataset.index) !== active && !v.paused) v.pause(); });
  }, [active]);

  const arrow = (dir: -1 | 1) => (
    <button type="button" onClick={() => go(active + dir)} disabled={dir < 0 ? active === 0 : active === items.length - 1}
      aria-label={dir < 0 ? t("gallery.prev") : t("gallery.next")}
      className={`absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-white disabled:opacity-0 sm:flex ${dir < 0 ? "start-2" : "end-2"}`}>
      <span className="rtl:-scale-x-100">{dir < 0 ? "‹" : "›"}</span>
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row">
      {many && (
        <div ref={thumbs} className="relative flex min-w-0 gap-2 overflow-x-auto pb-1 sm:max-h-[520px] sm:flex-col sm:overflow-y-auto sm:pb-0">
          {items.map((it, i) => (
            <button key={i} type="button" onClick={() => go(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-white p-1 transition ${i === active ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200 opacity-80 hover:opacity-100"}`}
              aria-label={it.kind === "video" ? t("gallery.playVideo", { n: i + 1 }) : t("gallery.showImage", { n: i + 1 })} aria-current={i === active}>
              {it.kind === "video" ? (
                <>
                  <video src={it.src} className="h-full w-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-lg text-white">▶</span>
                </>
              ) : (
                <ProductImage imageUrl={it.src} icon={icon} name="" size="sm" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <div ref={track} className="flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth rounded-md border border-slate-200 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0} aria-roledescription="carousel" aria-label={name}
          onKeyDown={(e) => { if (e.key === "ArrowRight") go(active + 1); if (e.key === "ArrowLeft") go(active - 1); if (e.key === "Enter") setFull(true); }}>
          {items.map((it, i) => (
            <div key={i} className="group relative h-full w-full shrink-0 snap-center p-4" aria-roledescription="slide" aria-label={`${i + 1} / ${items.length}`}>
              {it.kind === "video" ? (
                <video data-index={i} src={it.src} className="h-full w-full rounded bg-black object-contain" controls playsInline muted preload="metadata" />
              ) : (
                <button type="button" onClick={() => it.src && setFull(true)} className="h-full w-full cursor-zoom-in" aria-label={t("gallery.open")}>
                  <ProductImage imageUrl={it.src} icon={icon} name={i === 0 ? name : `${name} – ${i + 1}`} size="lg" />
                </button>
              )}
            </div>
          ))}
        </div>
        {many && arrow(-1)}
        {many && arrow(1)}
        {many && (
          <>
            <span className="absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">{active + 1} / {items.length}</span>
            <div className="mt-2 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
              {items.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300"}`} />)}
            </div>
          </>
        )}
      </div>

      {full && <Lightbox items={items} start={active} name={name} icon={icon} onClose={(i) => { setFull(false); go(i, false); }} />}
    </div>
  );
}

function Lightbox({ items, start, name, icon, onClose }: { items: Item[]; start: number; name: string; icon: string; onClose: (i: number) => void }) {
  const { t, dir } = useI18n();
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    const el = track.current;
    setZoom(null);
    if (el) el.scrollTo({ left: n * el.clientWidth * (dir === "rtl" ? -1 : 1), behavior: "smooth" });
    setIndex(n);
  }, [items.length, dir]);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: start * el.clientWidth * (dir === "rtl" ? -1 : 1) });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [start, dir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const n = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
        setIndex((cur) => { if (cur !== n) setZoom(null); return n; });
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={name}>
      <div className="flex items-center justify-between gap-3 p-3 text-sm">
        <span className="truncate">{name}</span>
        <span className="shrink-0 tabular-nums">{index + 1} / {items.length}</span>
        <button type="button" onClick={() => onClose(index)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20" aria-label={t("gallery.close")}>×</button>
      </div>
      <div ref={track} className={`flex flex-1 snap-x snap-mandatory overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${zoom ? "overflow-x-hidden" : "overflow-x-auto"}`}>
        {items.map((it, i) => (
          <div key={i} className="relative flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden p-2">
            {it.kind === "video" ? (
              <video src={it.src} className="max-h-full max-w-full" controls playsInline preload="metadata" />
            ) : it.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.src} alt={`${name} – ${i + 1}`} draggable={false}
                onDoubleClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setZoom(zoom ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}
                onClick={(e) => {
                  if (window.matchMedia("(pointer: coarse)").matches) return; // phones: pinch-zoom works natively
                  const r = e.currentTarget.getBoundingClientRect();
                  setZoom(zoom ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}
                style={i === index && zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                className={`max-h-full max-w-full select-none object-contain transition-transform duration-300 ${i === index && zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`} />
            ) : (
              <div className="h-40 w-40"><ProductImage imageUrl={null} icon={icon} name={name} size="lg" /></div>
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-4 p-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 disabled:opacity-30" aria-label={t("gallery.prev")}><span className="rtl:-scale-x-100">‹</span></button>
          <div className="flex max-w-[60vw] gap-1.5 overflow-x-auto">
            {items.map((_, i) => <button key={i} type="button" onClick={() => go(i)} aria-label={t("gallery.showImage", { n: i + 1 })} className={`h-2 shrink-0 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40"}`} />)}
          </div>
          <button type="button" onClick={() => go(index + 1)} disabled={index === items.length - 1} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 disabled:opacity-30" aria-label={t("gallery.next")}><span className="rtl:-scale-x-100">›</span></button>
        </div>
      )}
      <p className="pb-3 text-center text-xs text-white/60">{t("gallery.hint")}</p>
    </div>
  );
}
