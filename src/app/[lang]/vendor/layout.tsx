import type { Metadata } from "next";

// Vendors' private order links – never in search engines.
export const metadata: Metadata = { title: "Order for dispatch", robots: { index: false, follow: false } };

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
