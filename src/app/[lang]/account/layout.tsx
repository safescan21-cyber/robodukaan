import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AccountShell } from "./shell";

// Private area: keep it out of search results.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { default: t("account.my"), template: "%s | PCBDukaan" }, robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
