import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatLoader } from "@/components/ChatLoader";
import { JsonLd } from "@/components/JsonLd";
import { STORE } from "@/lib/constants";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  openGraph: {
    type: "website",
    siteName: "PCBDukaan",
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PCBDukaan – Industrial PCBs, electronics and PCB repair" }],
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "PCBDukaan – Industrial PCBs, Electronics & PCB Repair India",
    template: "%s | PCBDukaan",
  },
  description:
    "Industrial control boards, SMPS, VFD and motor-drive boards, PLC modules, load cells, sensors and power components — plus PCB repair. Shipped across India.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: STORE.name,
            url: SITE,
            logo: `${SITE}/logo-mark.svg`,
            email: STORE.email,
            ...(STORE.phone ? { telephone: STORE.phone } : {}),
            areaServed: "IN",
          }}
        />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <ChatLoader />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
