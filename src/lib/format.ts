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

// ₹1,23,456.70 (always two decimals, for invoices)
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatINR2(value: number) {
  return inr2.format(Number(value));
}

// 1234.5 → "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only" (Indian numbering)
export function rupeesInWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`);
  const three = (n: number) => [n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred` : "", two(n % 100)].filter(Boolean).join(" ");
  function words(n: number): string {
    if (n === 0) return "Zero";
    const parts: string[] = [];
    const crore = Math.floor(n / 1e7);
    if (crore) parts.push(`${words(crore)} Crore`);
    n %= 1e7;
    const lakh = Math.floor(n / 1e5);
    if (lakh) parts.push(`${two(lakh)} Lakh`);
    n %= 1e5;
    const thousand = Math.floor(n / 1000);
    if (thousand) parts.push(`${two(thousand)} Thousand`);
    n %= 1000;
    if (n) parts.push(three(n));
    return parts.join(" ");
  }
  const paiseTotal = Math.round(Number(amount) * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  return `${words(rupees)} Rupees${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}
