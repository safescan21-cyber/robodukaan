"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

type Item = { kind: "image"; src: string | null } | { kind: "video"; src: string };

export function ProductGallery({ images, videos = [], icon, name }: { images: string[]; videos?: string[]; icon: string; name: string }) {
  const items: Item[] = [
    ...(images.length ? images.map((src) => ({ kind: "image" as const, src })) : videos.length ? [] : [{ kind: "image" as const, src: null }]),
    ...videos.map((src) => ({ kind: "video" as const, src })),
  ];
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto sm:flex-col">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-white p-1 ${i === active ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200"}`}
              aria-label={it.kind === "video" ? `Play video ${i + 1}` : `Show image ${i + 1}`}
            >
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
      <div className="group aspect-square flex-1 overflow-hidden rounded-md border border-slate-200 bg-white p-4">
        {current.kind === "video" ? (
          <video key={current.src} src={current.src} className="h-full w-full rounded bg-black object-contain" controls playsInline autoPlay muted />
        ) : (
          <ProductImage imageUrl={current.src} icon={icon} name={name} size="lg" />
        )}
      </div>
    </div>
  );
}
