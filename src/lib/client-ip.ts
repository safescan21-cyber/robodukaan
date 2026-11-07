// The visitor's real IP address, for rate limiting.
//
// nginx sets X-Real-IP to the address that actually connected, so a visitor can't fake it.
// CF-Connecting-IP and X-Forwarded-For come from the request itself and anyone can send them,
// so CF-Connecting-IP is trusted only when the connection really comes from Cloudflare.

// Cloudflare's published ranges: https://www.cloudflare.com/ips/
const CLOUDFLARE_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CLOUDFLARE_V6 = ["2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"];

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

function v6ToBigInt(ip: string): bigint | null {
  if (!ip.includes(":") || ip.includes(".")) return null;
  const [head, tail = ""] = ip.split("::");
  if (ip.split("::").length > 2) return null;
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - h.length - t.length : 0;
  const groups = [...h, ...Array(Math.max(missing, 0)).fill("0"), ...t];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.reduce((acc, g) => (acc << BigInt(16)) + BigInt(parseInt(g, 16)), BigInt(0));
}

function inRanges(ip: string): boolean {
  const v4 = v4ToInt(ip.replace(/^::ffff:/i, ""));
  if (v4 !== null) {
    return CLOUDFLARE_V4.some((cidr) => {
      const [base, bits] = cidr.split("/");
      const mask = Number(bits) === 0 ? 0 : (0xffffffff << (32 - Number(bits))) >>> 0;
      return ((v4 & mask) >>> 0) === ((v4ToInt(base)! & mask) >>> 0);
    });
  }
  const v6 = v6ToBigInt(ip);
  if (v6 === null) return false;
  return CLOUDFLARE_V6.some((cidr) => {
    const [base, bits] = cidr.split("/");
    const shift = BigInt(128 - Number(bits));
    return v6 >> shift === v6ToBigInt(base)! >> shift;
  });
}

export function isCloudflareIp(ip: string) {
  return inRanges(ip.trim());
}

export function clientIp(headers: Headers): string {
  // The address that connected to nginx (set by nginx, not by the visitor).
  const peer = headers.get("x-real-ip")?.trim()
    || headers.get("x-forwarded-for")?.split(",").pop()?.trim()
    || "local";
  const cf = headers.get("cf-connecting-ip")?.trim();
  return cf && isCloudflareIp(peer) ? cf : peer;
}
