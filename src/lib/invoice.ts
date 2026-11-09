import { SELLER } from "./constants";
import type { Order } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

// GST split for an order: same state as the seller → CGST + SGST; other state → IGST; unknown seller state → one GST line.
// Used by the printable invoice and the invoice email so both always show the same numbers.
export function invoiceTotals(order: Pick<Order, "subtotal" | "discount" | "shipping" | "gst_rate" | "gst_amount" | "state" | "total">) {
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const shipping = Number(order.shipping);
  const taxable = round2(subtotal - discount + shipping);
  const rate = Number(order.gst_rate ?? 0);
  const gst = Number(order.gst_amount ?? 0);
  const sameState = !!SELLER.state && SELLER.state.toLowerCase() === order.state.toLowerCase();
  const taxLines: [string, number][] = !rate
    ? []
    : !SELLER.state
      ? [[`GST @ ${rate}%`, gst]]
      : sameState
        ? [[`CGST @ ${rate / 2}%`, round2(gst / 2)], [`SGST @ ${rate / 2}%`, round2(gst - round2(gst / 2))]]
        : [[`IGST @ ${rate}%`, gst]];
  return { subtotal, discount, shipping, taxable, rate, gst, taxLines, total: Number(order.total) };
}
