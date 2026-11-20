// Your business profiles on other websites (Admin → Business links). Shown in the footer and told to Google
// (Organization "sameAs"), so Google connects pcbdukaan.com with your Google Business, IndiaMART, Justdial …
// Each link must be on that site's own domain; empty ones are not shown.
export const BUSINESS_SITES = [
  { key: "google", label: "Google Business profile", hosts: ["g.page", "maps.app.goo.gl", "goo.gl", "google.com", "www.google.com", "maps.google.com", "share.google"], ph: "https://maps.app.goo.gl/…" },
  { key: "indiamart", label: "IndiaMART", hosts: ["indiamart.com", "www.indiamart.com", "m.indiamart.com"], ph: "https://www.indiamart.com/your-company/" },
  { key: "justdial", label: "Justdial", hosts: ["justdial.com", "www.justdial.com"], ph: "https://www.justdial.com/…" },
  { key: "tradeindia", label: "TradeIndia", hosts: ["tradeindia.com", "www.tradeindia.com"], ph: "https://www.tradeindia.com/…" },
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"], ph: "https://www.facebook.com/…" },
  { key: "instagram", label: "Instagram", hosts: ["instagram.com", "www.instagram.com"], ph: "https://www.instagram.com/…" },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "www.youtube.com", "m.youtube.com"], ph: "https://www.youtube.com/@…" },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com", "www.linkedin.com", "in.linkedin.com"], ph: "https://www.linkedin.com/company/…" },
  { key: "x", label: "X (Twitter)", hosts: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"], ph: "https://x.com/…" },
] as const;

export type BusinessLinks = Partial<Record<(typeof BUSINESS_SITES)[number]["key"], string>>;

export function cleanBusinessLinks(v: unknown): BusinessLinks {
  const x = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: BusinessLinks = {};
  for (const s of BUSINESS_SITES) {
    const raw = typeof x[s.key] === "string" ? (x[s.key] as string).trim().slice(0, 300) : "";
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && (s.hosts as readonly string[]).includes(u.hostname.toLowerCase())) out[s.key] = u.toString();
    } catch { /* not a link */ }
  }
  return out;
}
