import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { SELLER, STORE } from "./constants";
import { formatDate, formatINR2, rupeesInWords } from "./format";
import { invoiceTotals } from "./invoice";
import type { Order } from "./types";

// GST tax invoice as a PDF (A4) – the same content as the printable invoice page (InvoiceView).
// Attached to the "order confirmed" email and downloadable from the invoice pages.
// DejaVu Sans (assets/fonts, free licence) has the ₹ sign and Indian-language letters.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

export function invoiceFileName(order: Pick<Order, "invoice_number" | "order_number">) {
  return `Invoice-${(order.invoice_number ?? order.order_number).replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
}

export async function invoicePdf(order: Order): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Invoice ${order.invoice_number ?? order.order_number}`, Author: SELLER.companyName || STORE.name } });
  const regular = path.join(FONT_DIR, "DejaVuSans.ttf");
  const bold = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");
  const hasFonts = existsSync(regular) && existsSync(bold);
  const R = hasFonts ? "R" : "Helvetica";
  const B = hasFonts ? "B" : "Helvetica-Bold";
  if (hasFonts) { doc.registerFont("R", regular); doc.registerFont("B", bold); }
  // Without the font file, Helvetica can't print ₹ – write "Rs." instead.
  const money = (n: number) => (hasFonts ? formatINR2(n) : formatINR2(n).replace("₹", "Rs. "));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const L = 40, W = 515, Rt = L + W;
  const company = SELLER.companyName || STORE.name;
  const t = invoiceTotals(order);
  const issued = !!order.invoice_number;

  // ── Header ──
  doc.font(B).fontSize(16).fillColor("#0f172a").text(company, L, 40, { width: 300 });
  doc.font(R).fontSize(8.5).fillColor("#334155");
  if (SELLER.address) doc.text(SELLER.address, { width: 300 });
  if (SELLER.state) doc.text(`State: ${SELLER.state}`);
  doc.text(`${STORE.email}${STORE.phone ? ` · ${STORE.phone}` : ""} · pcbdukaan.com`);
  if (SELLER.gstin) doc.font(B).text(`GSTIN: ${SELLER.gstin}`).font(R);
  if (SELLER.pan) doc.text(`PAN: ${SELLER.pan}`);
  const headBottom = doc.y;
  doc.font(B).fontSize(14).fillColor(issued ? "#0f172a" : "#b45309").text(issued ? "TAX INVOICE" : "DRAFT", L + 300, 40, { width: 215, align: "right" });
  doc.font(R).fontSize(8).fillColor("#64748b").text(issued ? "Original for recipient" : "Not a tax invoice – number not issued", { width: 215, align: "right" });
  doc.moveDown(0.6).fontSize(9).fillColor("#0f172a");
  const meta: [string, string][] = [
    ["Invoice no.", order.invoice_number ?? "—"],
    ["Invoice date", order.invoice_date ? formatDate(order.invoice_date) : "—"],
    ["Order no.", order.order_number],
    ["Order date", formatDate(order.created_at)],
    ["Place of supply", order.state],
    ["Payment", order.payment_status === "paid" ? (order.payment_method === "online" ? "Paid online" : "Paid") : order.payment_method === "cod" ? "Cash on delivery" : "Pending"],
  ];
  let my = doc.y;
  for (const [k, v] of meta) {
    doc.font(R).fontSize(8.5).fillColor("#64748b").text(k, L + 300, my, { width: 95, align: "right" });
    doc.font(B).fontSize(8.5).fillColor("#0f172a").text(v, L + 400, my, { width: 115, align: "right" });
    my = Math.max(doc.y, my + 12);
  }
  let y = Math.max(headBottom, my) + 8;
  doc.moveTo(L, y).lineTo(Rt, y).lineWidth(1.5).strokeColor("#1e293b").stroke();

  // ── Bill to / Ship to ──
  y += 8;
  const addr = `${order.address_line}\n${order.city}, ${order.state} – ${order.pincode}`;
  doc.font(B).fontSize(7.5).fillColor("#64748b").text("BILL TO", L, y).text("SHIP TO", L + 270, y);
  doc.fontSize(9).fillColor("#0f172a");
  doc.font(B).text(order.buyer_company || order.customer_name, L, y + 11, { width: 250 });
  doc.font(R);
  if (order.buyer_company) doc.text(`Attn: ${order.customer_name}`, { width: 250 });
  doc.text(addr, { width: 250 }).text(`Mobile: ${order.phone}${order.email ? ` · ${order.email}` : ""}`, { width: 250 });
  if (order.buyer_gstin) doc.font(B).text(`GSTIN: ${order.buyer_gstin}`, { width: 250 }).font(R);
  const billBottom = doc.y;
  doc.font(B).text(order.customer_name, L + 270, y + 11, { width: 245 }).font(R).text(addr, { width: 245 });
  y = Math.max(billBottom, doc.y) + 10;

  // ── Items ──
  const cols = [{ w: 22, a: "left" }, { w: 228, a: "left" }, { w: 60, a: "left" }, { w: 35, a: "right" }, { w: 80, a: "right" }, { w: 90, a: "right" }] as const;
  const row = (cells: string[], opts: { bold?: boolean; fill?: string; sub?: string } = {}) => {
    doc.font(opts.bold ? B : R).fontSize(8.5);
    const heights = cells.map((c, i) => doc.heightOfString(c, { width: cols[i].w - 8 }) + (i === 1 && opts.sub ? 11 : 0));
    const h = Math.max(...heights) + 8;
    if (y + h > 760) { doc.addPage(); y = 40; }
    if (opts.fill) doc.rect(L, y, W, h).fill(opts.fill);
    let x = L;
    cells.forEach((c, i) => {
      doc.fillColor("#0f172a").font(opts.bold ? B : R).fontSize(8.5).text(c, x + 4, y + 4, { width: cols[i].w - 8, align: cols[i].a });
      if (i === 1 && opts.sub) doc.font(R).fontSize(7).fillColor("#64748b").text(opts.sub, x + 4, doc.y, { width: cols[i].w - 8 });
      x += cols[i].w;
    });
    doc.rect(L, y, W, h).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
    y += h;
  };
  row(["#", "Description", "HSN", "Qty", "Rate", "Amount"], { bold: true, fill: "#f1f5f9" });
  (order.order_items ?? []).forEach((it, i) =>
    row([String(i + 1), it.name, it.hsn_code || "—", String(it.quantity), money(it.unit_price), money(it.line_total)], { sub: `SKU: ${it.sku}` }));

  // ── Totals ──
  y += 8;
  const lines: [string, string, boolean?][] = [
    ["Subtotal", money(t.subtotal)],
    ...(t.discount > 0 ? [[`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `− ${money(t.discount)}`] as [string, string]] : []),
    ["Shipping", money(t.shipping)],
    ["Taxable value", money(t.taxable), true],
    ...t.taxLines.map(([l, v]) => [l, money(v)] as [string, string]),
    ["Total", money(t.total), true],
  ];
  if (y + lines.length * 17 + 90 > 800) { doc.addPage(); y = 40; }
  for (const [label, value, strong] of lines) {
    const last = label === "Total";
    if (last) doc.rect(L + 275, y, 240, 18).fill("#f1f5f9");
    doc.font(strong ? B : R).fontSize(last ? 10.5 : 9).fillColor("#0f172a")
      .text(label, L + 280, y + 4, { width: 130 }).text(value, L + 400, y + 4, { width: 110, align: "right" });
    doc.rect(L + 275, y, 240, 18).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
    y += 18;
  }
  y += 8;
  doc.font(R).fontSize(8.5).fillColor("#64748b").text("Amount in words: ", L, y, { continued: true }).font(B).fillColor("#0f172a").text(rupeesInWords(t.total), { width: W });

  // ── Declaration + signature ──
  y = doc.y + 24;
  doc.font(R).fontSize(7.5).fillColor("#475569")
    .text("Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", L, y, { width: 300 })
    .text("This is a computer-generated invoice.", { width: 300 });
  doc.font(B).fontSize(9).fillColor("#0f172a").text(`For ${company}`, L + 330, y, { width: 185, align: "center" });
  doc.moveTo(L + 355, y + 50).lineTo(L + 490, y + 50).lineWidth(0.5).strokeColor("#94a3b8").stroke();
  doc.font(R).fontSize(7.5).fillColor("#475569").text("Authorised signatory", L + 330, y + 54, { width: 185, align: "center" });

  if (order.status === "cancelled") {
    doc.save().rotate(-25, { origin: [300, 420] }).font(B).fontSize(72).fillColor("#ef4444").fillOpacity(0.15).text("CANCELLED", 90, 380).restore();
  }
  doc.end();
  return done;
}
