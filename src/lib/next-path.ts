// Only allow redirects back into this site (never to another domain).
export function safeNextPath(fallback = "/account") {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
