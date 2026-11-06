import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, languageAlternates, localizePath, type Locale } from "./config";
import { makeT, type Dict } from "./translate";
import en from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<Dict>> = {
  en: async () => en,
  hi: () => import("./dictionaries/hi").then((m) => m.default),
  ur: () => import("./dictionaries/ur").then((m) => m.default),
  fr: () => import("./dictionaries/fr").then((m) => m.default),
  ko: () => import("./dictionaries/ko").then((m) => m.default),
  ja: () => import("./dictionaries/ja").then((m) => m.default),
  zh: () => import("./dictionaries/zh").then((m) => m.default),
};

export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(locale?: Locale): Promise<Dict> {
  return loaders[locale ?? (await getLocale())]();
}

// For Server Components: const { t, locale } = await getT();
export async function getT() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { t: makeT(dict, en), locale, dict };
}

// canonical (in the current language) + hreflang links for a page's English path.
export async function alternatesFor(path: string) {
  const locale = await getLocale();
  return { canonical: localizePath(path, locale), languages: languageAlternates(path) };
}
