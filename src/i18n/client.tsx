"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps } from "react";
import { DEFAULT_LOCALE, RTL_LOCALES, localizePath, type Locale } from "./config";
import { makeT, type Dict } from "./translate";
import en from "./dictionaries/en";

type I18n = { locale: Locale; dir: "ltr" | "rtl"; t: ReturnType<typeof makeT>; href: (path: string) => string };

const I18nContext = createContext<I18n>({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  t: makeT(en, en),
  href: (p) => p,
});

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      locale,
      dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
      t: makeT(dict, en),
      href: (path: string) => localizePath(path, locale),
    }),
    [locale, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

// next/link that keeps the visitor in their language.
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  return <NextLink href={typeof href === "string" ? localize(href) : href} {...props} />;
}

// useRouter that keeps the visitor in their language.
export function useRouter() {
  const router = useNextRouter();
  const { href } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string, opts?: Parameters<typeof router.push>[1]) => router.push(href(path), opts),
      replace: (path: string, opts?: Parameters<typeof router.replace>[1]) => router.replace(href(path), opts),
    }),
    [router, href],
  );
}
