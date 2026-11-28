// Simple line drawings of each CNC machine type – shown until a real photo is uploaded in Admin → CNC photos.
const ART: Record<string, React.ReactNode> = {
  vmc: (
    <>
      <rect x="20" y="22" width="120" height="92" rx="6" />
      <rect x="32" y="34" width="62" height="56" rx="3" className="fill-sky-100/70" />
      <path d="M63 34v18M56 52h14l-3 10h-8z" />
      <rect x="40" y="76" width="46" height="6" rx="1" />
      <rect x="104" y="38" width="26" height="30" rx="3" />
      <path d="M108 44h18M108 50h12M108 56h16" />
      <path d="M26 114v8M134 114v8M20 122h120" />
    </>
  ),
  hmc: (
    <>
      <rect x="14" y="26" width="132" height="86" rx="6" />
      <rect x="26" y="38" width="78" height="56" rx="3" className="fill-sky-100/70" />
      <path d="M26 64h22M48 58h8v12h-8z" />
      <rect x="66" y="52" width="26" height="26" rx="2" />
      <path d="M66 82h26" />
      <rect x="112" y="38" width="24" height="28" rx="3" />
      <path d="M116 44h16M116 50h10M116 56h14M20 112v8M140 112v8M14 120h132" />
    </>
  ),
  "5axis": (
    <>
      <rect x="20" y="20" width="120" height="94" rx="6" />
      <rect x="32" y="32" width="64" height="60" rx="3" className="fill-sky-100/70" />
      <path d="M64 32v16M58 48h12l-2 8h-8z" />
      <ellipse cx="64" cy="76" rx="18" ry="5" />
      <path d="M46 76v6a18 5 0 0 0 36 0v-6M40 84h48" />
      <rect x="104" y="36" width="26" height="30" rx="3" />
      <path d="M108 42h18M108 48h12M108 54h16M26 114v8M134 114v8M20 122h120" />
    </>
  ),
  "drill-tap": (
    <>
      <rect x="34" y="16" width="92" height="100" rx="6" />
      <rect x="44" y="28" width="52" height="60" rx="3" className="fill-sky-100/70" />
      <path d="M70 28v16M65 44h10l-2 8h-6z" />
      <rect x="52" y="74" width="36" height="5" rx="1" />
      <rect x="102" y="30" width="16" height="22" rx="2" />
      <path d="M40 116v6M120 116v6M34 122h92" />
    </>
  ),
  turning: (
    <>
      <path d="M10 108h140M18 108v12M142 108v12" />
      <rect x="12" y="30" width="136" height="78" rx="6" />
      <rect x="24" y="42" width="84" height="50" rx="3" className="fill-sky-100/70" />
      <rect x="28" y="54" width="16" height="26" rx="2" />
      <path d="M44 67h36M44 63h36M44 71h36" />
      <circle cx="90" cy="58" r="9" />
      <path d="M90 67v8" />
      <rect x="116" y="42" width="22" height="28" rx="3" />
      <path d="M120 48h14M120 54h10M120 60h12" />
    </>
  ),
  vtl: (
    <>
      <rect x="22" y="14" width="116" height="104" rx="6" />
      <rect x="34" y="26" width="66" height="70" rx="3" className="fill-sky-100/70" />
      <path d="M67 26v22M61 48h12v8H61z" />
      <ellipse cx="67" cy="82" rx="24" ry="6" />
      <path d="M43 82v6a24 6 0 0 0 48 0v-6" />
      <rect x="108" y="28" width="22" height="28" rx="3" />
      <path d="M112 34h14M112 40h10M112 46h12M28 118v6M132 118v6M22 124h116" />
    </>
  ),
};

export function MachineArt({ type, className = "" }: { type: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true" className={`fill-none stroke-slate-500 ${className}`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {ART[type] ?? ART.vmc}
    </svg>
  );
}

export type MachinePhoto = { url: string; credit?: string; license?: string; licenseUrl?: string; sourceUrl?: string };

// Real photo when there is one, else the drawing. Free-licence photos carry their required credit.
export function MachineImage({ type, photo, alt, className = "" }: { type: string; photo?: MachinePhoto | null; alt: string; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-sky-50 ${className}`}>
      {photo?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={alt} loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <MachineArt type={type} className="h-3/4 w-3/4" />
      )}
      {photo?.credit && !photo.license && <span className="absolute bottom-1 end-1 rounded bg-black/50 px-1.5 text-[10px] text-white">{photo.credit}</span>}
    </div>
  );
}

// Licence credit line for free-licence photos (e.g. "Photo: A. Walbert, CC BY-SA 3.0, via Wikimedia Commons").
export function PhotoCredit({ photo, className = "" }: { photo?: MachinePhoto | null; className?: string }) {
  if (!photo?.license) return null;
  return (
    <p className={`text-[11px] leading-snug ${className}`}>
      Photo: {photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noopener" className="underline">{photo.credit || "see source"}</a> : photo.credit},{" "}
      {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener license" className="underline">{photo.license}</a> : photo.license}
      {photo.sourceUrl?.includes("wikimedia") ? ", via Wikimedia Commons" : ""}
    </p>
  );
}
