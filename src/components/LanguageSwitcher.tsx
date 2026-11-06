"use client";

import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, localizePath, type Locale } from "@/i18n/config";

// Switches language and stays on the same page.
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  return (
    <label className="flex items-center gap-1 text-slate-300">
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale;
          try {
            document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
          } catch {
            /* ignore */
          }
          window.location.href = localizePath(window.location.pathname, next) + window.location.search;
        }}
        className="cursor-pointer rounded bg-slate-800 px-1.5 py-0.5 text-xs text-white outline-none ring-1 ring-slate-600 focus:ring-accent-500"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </label>
  );
}
