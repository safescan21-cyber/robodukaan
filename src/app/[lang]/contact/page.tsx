import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { STORE } from "@/lib/constants";
import { getT } from "@/i18n/server";
import { languageAlternates } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.contact"), alternates: { canonical: "/contact", languages: languageAlternates("/contact") } };
}

export default async function ContactPage() {
  const { t } = await getT();
  const tel = STORE.phone.replace(/\s/g, "");
  return (
    <InfoPage title={t("nav.contact")}>
      <p>{t("contact.intro")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {tel && <a href={`tel:${tel}`} className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">📞</p><p className="font-semibold">{t("contact.call")}</p><p dir="ltr">{STORE.phone}</p></a>}
        {tel && <a href={`https://wa.me/${tel.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">💬</p><p className="font-semibold">WhatsApp</p><p>{t("contact.chat")}</p></a>}
        <a href={`mailto:${STORE.email}`} className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-brand-600"><p className="text-2xl">✉️</p><p className="font-semibold">{t("form.email")}</p><p dir="ltr">{STORE.email}</p></a>
      </div>
      <p>{t("contact.hours")}</p>
    </InfoPage>
  );
}
