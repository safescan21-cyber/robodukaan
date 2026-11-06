import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { getT } from "@/i18n/server";
import { languageAlternates } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.shipping"), alternates: { canonical: "/shipping-returns", languages: languageAlternates("/shipping-returns") } };
}

export default async function ShippingReturnsPage() {
  const { t } = await getT();
  return (
    <InfoPage title={t("nav.shipping")}>
      <h2>{t("ship.title")}</h2>
      <ul>
        <li>{t("ship.li1")}</li>
        <li>{t("ship.li2")}</li>
        <li>{t("ship.li3")}</li>
        <li>{t("ship.li4")}</li>
      </ul>
      <h2>{t("ship.returnsTitle")}</h2>
      <ul>
        <li>{t("ship.r1")}</li>
        <li>{t("ship.r2")}</li>
        <li>{t("ship.r3")}</li>
      </ul>
      <h2>{t("ship.cancelTitle")}</h2>
      <p>{t("ship.cancel")}</p>
    </InfoPage>
  );
}
