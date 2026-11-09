import type { Metadata } from "next";
import { alternatesFor, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("track.title"), description: t("meta.track"), alternates: await alternatesFor("/track") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
