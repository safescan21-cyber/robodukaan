import type { MetadataRoute } from "next";
import { LOCALES, localizePath } from "@/i18n/config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

// Private areas, blocked in every language (/cart, /hi/cart, /fr/cart …).
// Login, register, wishlist etc. are not blocked here: they carry a "noindex" tag instead,
// which search engines can only see if they're allowed to fetch the page.
const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/order-success", "/reset-password"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...LOCALES.flatMap((l) => PRIVATE.map((p) => localizePath(p, l)))],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
