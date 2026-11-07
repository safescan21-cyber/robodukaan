import type { Metadata } from "next";
import { AdminShell } from "./shell";

// Private area: keep it out of search results.
export async function generateMetadata(): Promise<Metadata> {

  return { title: { default: "Admin", template: "%s | PCBDukaan" }, robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
