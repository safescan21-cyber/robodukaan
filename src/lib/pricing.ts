// Quantity price breaks ("buy 10+ at ₹X each"). Same rule as public.tier_price() in the database
// (migration 023), which decides the real price at checkout.
export type PriceTier = { min_qty: number; price: number };

export function validTiers(tiers: unknown, base: number): PriceTier[] {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .map((t) => ({ min_qty: Math.floor(Number(t?.min_qty)), price: Number(t?.price) }))
    .filter((t) => t.min_qty >= 2 && t.price > 0 && t.price <= base)
    .sort((a, b) => a.min_qty - b.min_qty);
}

export function unitPrice(base: number, tiers: unknown, qty: number) {
  let price = base;
  for (const t of validTiers(tiers, base)) if (qty >= t.min_qty) price = Math.min(price, t.price);
  return price;
}

// The next break the customer could reach, for "Add 3 more to pay ₹X each".
export function nextTier(base: number, tiers: unknown, qty: number) {
  const current = unitPrice(base, tiers, qty);
  return validTiers(tiers, base).find((t) => t.min_qty > qty && t.price < current) ?? null;
}

// "10:2050; 25:1990" ⇄ tiers (bulk upload and admin form).
export function parseTiers(text: string): PriceTier[] | string {
  const out: PriceTier[] = [];
  for (const part of text.split(/[;|\n]+/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.replace(/[₹,\s]/g, "").match(/^(\d+)\+?[:=@](\d+(?:\.\d{1,2})?)$/);
    if (!m) return `“${part}” – write quantity:price, e.g. 10:2050`;
    out.push({ min_qty: Number(m[1]), price: Number(m[2]) });
  }
  return out;
}
export const tiersText = (tiers: unknown) =>
  (Array.isArray(tiers) ? tiers : []).map((t: PriceTier) => `${t.min_qty}:${t.price}`).join("; ");
