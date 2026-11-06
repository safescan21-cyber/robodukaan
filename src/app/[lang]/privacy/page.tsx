import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getT } from "@/i18n/server";
import { languageAlternates } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.privacy"), alternates: { canonical: "/privacy", languages: languageAlternates("/privacy") } };
}

export default async function PrivacyPage() {
  const { t } = await getT();
  return (
    <InfoPage title={t("nav.privacy")}>
      <p>{t("privacy.p1")}</p>
      <h2>{t("privacy.useTitle")}</h2>
      <ul>
        <li>{t("privacy.li1")}</li>
        <li>{t("privacy.li2")}</li>
        <li>{t("privacy.li3")}</li>
      </ul>
      <h2>{t("privacy.storageTitle")}</h2>
      <p>{t("privacy.p2")}</p>
    </InfoPage>
  );
}
