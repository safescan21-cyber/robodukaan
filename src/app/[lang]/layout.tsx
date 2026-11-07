import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatLoader } from "@/components/ChatLoader";
import { JsonLd } from "@/components/JsonLd";
import { SELLER, STORE } from "@/lib/constants";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, LOCALE_TAGS, RTL_LOCALES, isLocale } from "@/i18n/config";
import { getDictionary, getT } from "@/i18n/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getT();
  return {
    metadataBase: new URL(SITE),
    icons: { icon: "/favicon.svg" },
    openGraph: {
      type: "website",
      siteName: "PCBDukaan",
      locale: LOCALE_TAGS[locale].replace("-", "_"),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: t("meta.ogAlt") }],
    },
    twitter: { card: "summary_large_image" },
    title: { default: t("meta.title"), template: "%s | PCBDukaan" },
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <html lang={LOCALE_TAGS[lang]} dir={RTL_LOCALES.includes(lang) ? "rtl" : "ltr"}>
      <body className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 antialiased">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE}/#organization`,
              name: STORE.name,
              ...(SELLER.companyName ? { legalName: SELLER.companyName } : {}),
              url: SITE,
              logo: { "@type": "ImageObject", url: `${SITE}/logo-512.png`, width: 512, height: 512 },
              image: `${SITE}/og.png`,
              email: STORE.email,
              ...(STORE.phone ? { telephone: STORE.phone } : {}),
              contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: STORE.email, areaServed: "IN", availableLanguage: ["English", "Hindi"] },
              areaServed: { "@type": "Country", name: "India" },
              knowsAbout: ["Industrial PCB repair", "VFD repair", "SMPS repair", "PLC repair", "Industrial control boards", "Power supplies", "Load cells", "Industrial sensors"],
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE}/#website`,
              name: STORE.name,
              alternateName: ["PCB Dukaan", "pcbdukaan.com"],
              url: SITE,
              inLanguage: ["en-IN", "hi-IN", "ur", "fr", "ko", "ja", "zh-Hans"],
              publisher: { "@id": `${SITE}/#organization` },
            },
          ]}
        />
        <I18nProvider locale={lang} dict={dict}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="print:hidden"><Header /></div>
                <main className="flex-1">{children}</main>
                <div className="print:hidden"><Footer /><ChatLoader /></div>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
