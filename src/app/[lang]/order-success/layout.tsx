import type { Metadata } from "next";
import { getT } from "@/i18n/server";

// Private page: keep it out of search results.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("success.orderNumber"), robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
