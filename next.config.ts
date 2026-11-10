import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browser rules that don't affect how the site works: no embedding on other sites (clickjacking),
  // no plugins, no changing the base URL, forms only submit to this site.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

// English lives at the plain address (/products); other languages at /hi/products etc.
// Pages live under app/[lang], so plain addresses are rewritten to /en internally.
// (Done here, not in proxy.ts: a proxy rewrite behind nginx's X-Forwarded-Proto
// made Next fetch itself over https on the plain-http port.)
// Not rewritten to /en/…: other languages, API routes, Next.js files and folders in public/ (login email layouts).
const OTHER = "hi|ur|fr|ko|ja|zh|en|api|_next|email-templates";

const nextConfig: NextConfig = {
  // PDF invoices: pdfkit reads its own data files at run time, so it is loaded from node_modules as is.
  serverExternalPackages: ["pdfkit"],
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // One address for Google and customers: www → pcbdukaan.com
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pcbdukaan.com" }],
        destination: "https://pcbdukaan.com/:path*",
        permanent: true,
      },
      // /en/products → /products (one address per page)
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/en" },
        // First segment is not a language/api/_next and has no dot (files like sitemap.xml are left alone).
        { source: `/:first((?!(?:${OTHER})(?:/|$))[^/.]+)/:rest*`, destination: "/en/:first/:rest*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
