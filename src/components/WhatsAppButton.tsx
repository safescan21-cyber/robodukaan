"use client";

import { useI18n } from "@/i18n/client";
import { STORE } from "@/lib/constants";

// "Ask on WhatsApp" with a ready-made message. Hidden until STORE.whatsapp is set in lib/constants.ts.
export function WhatsAppButton({ text, className = "" }: { text?: string; className?: string }) {
  const { t } = useI18n();
  if (!STORE.whatsapp) return null;
  const href = `https://wa.me/${STORE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/></svg>
      {t("whatsapp.ask")}
    </a>
  );
}
