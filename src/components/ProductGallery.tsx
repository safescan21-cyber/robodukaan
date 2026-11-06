"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

export function ProductGallery({ images, icon, name }: { images: string[]; icon: string; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [null];
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {list.length > 1 && (
        <div className="flex gap-2 sm:flex-col">
          {list.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded border bg-white p-1 ${i === active ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200"}`}
              aria-label={`Show image ${i + 1}`}
            >
              <ProductImage imageUrl={src} icon={icon} name="" size="sm" />
            </button>
          ))}
        </div>
      )}
      <div className="group aspect-square flex-1 overflow-hidden rounded-md border border-slate-200 bg-white p-4">
        <ProductImage imageUrl={list[active]} icon={icon} name={name} size="lg" />
      </div>
    </div>
  );
}
