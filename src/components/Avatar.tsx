// Round profile photo, or the first letter of the name when there's no photo.
export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  const letter = (name?.trim()[0] ?? "?").toUpperCase();
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover ring-1 ring-slate-200" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {letter}
    </span>
  );
}
