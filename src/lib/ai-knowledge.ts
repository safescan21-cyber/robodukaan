import { REPAIR_TERMS, STORE } from "./constants";
import { FREE_SHIPPING_FROM, GST_RATE, SHIPPING_FEE } from "./format";
import { REPAIR_SERVICES } from "./seo-content";

// What the chat assistant knows about the shop – built from the site's own settings and pages, so it never
// invents policies. Admin → AI assistant adds more answers (table ai_knowledge); those come first.
export type Fact = { topic: string; keywords: string[]; text: string; custom?: boolean };

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function builtInFacts(opts: { onlinePayment: boolean }): Fact[] {
  const repairPrices = REPAIR_SERVICES.filter((s) => s.prices?.length)
    .map((s) => `${s.name}: ${s.prices!.map((p) => `${p.item} ${inr(p.from)}${p.to ? `–${inr(p.to)}` : "+"}`).join("; ")}`)
    .join(". ");
  return [
    { topic: "Shipping & delivery", keywords: ["ship", "shipping", "delivery", "deliver", "courier", "dispatch", "days", "when", "arrive", "pin", "pincode", "free", "charge", "kab", "milega", "bhejo"],
      text: `Free shipping on orders of ${inr(FREE_SHIPPING_FROM)} or more; ${inr(SHIPPING_FEE)} below that. In-stock items marked "Ready to dispatch" ship within 24 hours on working days. Delivery usually takes 2–7 working days depending on the PIN code (check it on the product page). A courier tracking link is sent once the order ships; track it on /track.` },
    { topic: "Order status & tracking", keywords: ["track", "tracking", "status", "where", "order", "awb", "shipped", "update", "kaha"],
      text: `Customers get email and WhatsApp updates when the order is confirmed (with the GST invoice PDF), packed, dispatched (courier and tracking number) and delivered. They can also check any order on /track with the order number and mobile number, or in My account → My orders.` },
    { topic: "Payment", keywords: ["pay", "payment", "cod", "cash", "upi", "card", "online", "netbanking", "gpay", "phonepe", "paytm", "emi"],
      text: `Cash on delivery is available across India.${opts.onlinePayment ? " Online payment (UPI, cards, net banking, wallets) is offered at checkout through Razorpay." : " Online payment is not available yet."} Prices on the site exclude GST; ${GST_RATE}% GST is added at checkout.` },
    { topic: "GST invoice", keywords: ["gst", "gstin", "invoice", "bill", "tax", "input", "credit", "company", "business", "itc"],
      text: `Every order gets a GST tax invoice. Business buyers enter their company name and GSTIN at checkout to claim input tax credit. The invoice PDF is emailed when the order is confirmed and can be downloaded any time from My account → My orders → Invoice.` },
    { topic: "Returns & replacement", keywords: ["return", "refund", "replace", "replacement", "damaged", "defective", "broken", "wrong", "faulty", "exchange", "warranty claim"],
      text: `If a product arrives damaged or defective, contact us within 7 days of delivery for a replacement. Keep the original packaging and share photos or a short video of the issue. Parts damaged by wrong wiring, soldering or over-voltage can't be replaced. Details: /shipping-returns.` },
    { topic: "Cancellation", keywords: ["cancel", "cancellation", "change order", "modify"],
      text: `An order can be cancelled from My account → My orders until it is packed. After that, contact us at ${STORE.email}.` },
    { topic: "Warranty", keywords: ["warranty", "guarantee", "garanti", "months"],
      text: `Product warranty is shown on each product page (in months). Parts are tested before dispatch. PCB repairs come with a ${REPAIR_TERMS.warrantyMonths}-month repair warranty.` },
    { topic: "PCB repair service", keywords: ["repair", "repairing", "fix", "faulty", "burnt", "dead", "not working", "kharab", "theek", "mrammat"],
      text: `We repair industrial PCBs at component level: VFD/AC drives, SMPS, PLC, HMI, servo drives, inverter/UPS cards, machine control boards and weighing indicators. How it works: upload photos on /pcb-repair → free quote in 1–2 working days → no work without your approval → load-tested${REPAIR_TERMS.testVideo ? " with a test video before we ship it back" : ""} → ${REPAIR_TERMS.warrantyMonths}-month warranty. Track a repair on /track (Repair tab).` },
    { topic: "Repair prices", keywords: ["repair price", "repair cost", "repair charges", "repairing cost", "repair rate", "repair kitna", "repair charge"],
      text: `Typical repair prices (+ GST; the exact price comes in the free quote after the photo check): ${repairPrices}.` },
    { topic: "Bulk orders", keywords: ["bulk", "quantity", "wholesale", "dealer", "reseller", "moq", "discount", "quote", "rfq", "bom", "pieces", "pcs"],
      text: `Many products have bulk prices shown on the product page (e.g. 10+ pieces cheaper). For a parts list, use /quick-order (paste or upload part numbers and quantities). For large quantities or items not listed, request a quote on /bulk-quote.` },
    { topic: "Fault codes & guides", keywords: ["fault", "error", "code", "alarm", "trip", "oc", "ov", "uv", "guide", "how to", "troubleshoot"],
      text: `VFD fault-code explanations are on /fault-codes and step-by-step repair guides on /repair-guides. For a board that still fails, use the repair service on /pcb-repair.` },
    { topic: "Account & login", keywords: ["login", "log in", "account", "password", "otp", "code", "sign up", "register", "forgot"],
      text: `Log in on /login with a 6-digit code sent to your email, or with a password. Forgot your password? Use /forgot-password. Customers must log in to place an order.` },
    { topic: "Contact", keywords: ["contact", "call", "phone", "email", "whatsapp", "talk", "human", "person", "support", "address"],
      text: `Email ${STORE.email}${STORE.whatsapp ? ` or WhatsApp +${STORE.whatsapp}` : ""}${STORE.phone ? ` · Phone ${STORE.phone}` : ""}. Contact page: /contact.` },
    { topic: "Technician partners & jobs", keywords: ["partner", "technician", "franchise", "job", "career", "vacancy", "work with"],
      text: `Repair technicians can join as partners on /repair-partners. Open jobs are on /careers.` },
  ];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s+-]/g, " ");

// The facts that match the customer's message best (custom answers first when they match equally).
export function pickFacts(message: string, facts: Fact[], max = 3): Fact[] {
  const text = ` ${norm(message)} `;
  const words = new Set(text.split(/\s+/).filter((w) => w.length >= 3));
  return facts
    .map((f) => {
      let score = 0;
      for (const k of f.keywords) {
        const kw = norm(k).trim();
        if (!kw) continue;
        if (kw.includes(" ") ? text.includes(` ${kw} `) || text.includes(kw) : words.has(kw) || (kw.length >= 4 && [...words].some((w) => w.startsWith(kw)))) score += kw.includes(" ") ? 3 : 2;
      }
      return { f, score: score + (f.custom && score > 0 ? 1 : 0) };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.f);
}

// Admin answers → facts (keywords: the admin's own, plus the important words of the question).
export function customFacts(rows: { question: string; answer: string; keywords: string | null }[]): Fact[] {
  const STOP = new Set("the and for you your are can how what when where which with does have this that from about kya hai ka ki ke".split(" "));
  return rows.map((r) => ({
    topic: r.question,
    text: r.answer,
    custom: true,
    keywords: [
      ...(r.keywords ?? "").split(/[,;]+/).map((k) => k.trim()).filter(Boolean),
      ...norm(r.question).split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)),
    ],
  }));
}
