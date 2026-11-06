export const LOCALES = ["en", "hi", "ur", "fr", "ko", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: Locale[] = ["ur"];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
  fr: "Français",
  ko: "한국어",
  ja: "日本語",
  zh: "中文",
};

// Used for <html lang> and hreflang.
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-IN", hi: "hi-IN", ur: "ur", fr: "fr", ko: "ko", ja: "ja", zh: "zh-Hans",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// "/products" → "/hi/products" (English keeps the plain address).
export function localizePath(path: string, locale: Locale) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const first = path.split(/[/?#]/)[1];
  if (isLocale(first)) {
    // Already has a locale: swap it.
    const rest = path.slice(first.length + 1) || "/";
    return locale === DEFAULT_LOCALE ? rest : `/${locale}${rest === "/" ? "" : rest}`;
  }
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

// "/hi/products" → "/products"
export function stripLocale(path: string) {
  const first = path.split(/[/?#]/)[1];
  return isLocale(first) ? path.slice(first.length + 1) || "/" : path;
}

// hreflang alternates for a page's English path.
export function languageAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_TAGS[l]] = localizePath(path, l);
  languages["x-default"] = path;
  return languages;
}
