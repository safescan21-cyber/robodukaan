const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number) {
  return inr.format(Number(value));
}

export function discountPercent(price: number, mrp: number | null) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export const FREE_SHIPPING_FROM = 499;
export const GST_RATE = 18;

// Prices are excluding GST; GST is added on goods after discount, plus shipping.
export function gstFor(taxable: number) {
  return Math.round(taxable * GST_RATE) / 100;
}
export const SHIPPING_FEE = 49;

export function shippingFor(subtotal: number) {
  return subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_FEE;
}

export function productImage(p: { images?: string[] | null; image_url?: string | null }) {
  return p.images?.find(Boolean) ?? p.image_url ?? null;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function slugify(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
