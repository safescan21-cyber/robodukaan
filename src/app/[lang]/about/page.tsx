import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getT, alternatesFor } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.about"), description: t("meta.about"), alternates: await alternatesFor("/about") };
}

export default async function AboutPage() {
  const { t } = await getT();
  return (
    <InfoPage title={t("about.title")}>
      <p>{t("about.p1")}</p>
      <h2>{t("about.why")}</h2>
      <ul>
        <li>{t("about.li1")}</li>
        <li>{t("about.li2")}</li>
        <li>{t("about.li3")}</li>
        <li>{t("about.li4")}</li>
        <li>{t("about.li5")}</li>
      </ul>
    </InfoPage>
  );
}
