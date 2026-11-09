import { formatINR2 } from "./format";
import type { OrderStatus } from "./types";

// What changed on an order since the customer was last told, as a customer-friendly message.
// `previous` is orders.notified_key: "status|payment_status|tracking_url". Pure function – easy to test.
export type OrderEventKind = "confirmed" | "packed" | "shipped" | "tracking" | "delivered" | "cancelled" | "paid" | "refunded";
export type OrderEvent = { kind: OrderEventKind; title: string; text: string; link: string; linkLabel: string };
export type EventOrder = {
  id: string; status: OrderStatus; payment_status: string; tracking_url: string | null; total: number;
};

export function orderEvent(previous: string, o: EventOrder, site: string, courier?: string | null, awb?: string | null): OrderEvent | null {
  const [ps, pp, ...rest] = (previous || "pending|pending|").split("|");
  const pt = rest.join("|");
  const orderLink = `${site}/account/orders/${o.id}`;
  const ship = [courier && `by ${courier}`, awb && `tracking no. ${awb}`].filter(Boolean).join(", ");
  const paidNow = o.payment_status === "paid" && pp !== "paid";
  const track = o.tracking_url ? { link: o.tracking_url, linkLabel: "Track your shipment" } : { link: orderLink, linkLabel: "View your order" };
  const view = { link: orderLink, linkLabel: "View your order" };

  if (o.status !== ps) {
    switch (o.status) {
      case "confirmed":
        return { kind: "confirmed", title: "Your order is confirmed ✅", text: "Confirmed ✅ – we are preparing it for dispatch", ...view };
      case "packed":
        return { kind: "packed", title: "Your order is packed 📦", text: "Packed 📦 – it will be handed to the courier soon", ...view };
      case "shipped":
        return { kind: "shipped", title: "Your order is on its way 🚚", text: `Dispatched 🚚${ship ? ` ${ship}` : ""}`, ...track };
      case "delivered":
        return {
          kind: "delivered", title: "Your order has been delivered ✅",
          text: `Delivered ✅${paidNow ? ` – payment of ${formatINR2(o.total)} received` : ""} – thank you for shopping with PCBDukaan. Please rate the product on our website`,
          ...view,
        };
      case "cancelled":
        return {
          kind: "cancelled", title: "Your order has been cancelled",
          text: `Cancelled ❌${o.payment_status === "paid" || o.payment_status === "refunded" ? " – your refund will be processed within 5–7 working days" : ""}. Questions? Just reply to this message`,
          ...view,
        };
      default:
        return null; // back to "pending" – nothing to tell
    }
  }
  if (o.tracking_url && o.tracking_url !== pt && (o.status === "shipped" || o.status === "packed")) {
    return { kind: "tracking", title: "Tracking for your order 🚚", text: `Tracking link added 🚚${ship ? ` – ${ship}` : ""}`, link: o.tracking_url, linkLabel: "Track your shipment" };
  }
  if (o.payment_status !== pp) {
    if (o.payment_status === "paid")
      return { kind: "paid", title: "Payment received ✅", text: `Payment of ${formatINR2(o.total)} received ✅ – thank you`, ...view };
    if (o.payment_status === "refunded")
      return { kind: "refunded", title: "Refund processed 💸", text: `Refund of ${formatINR2(o.total)} processed 💸 – it can take 5–7 working days to reach your account`, ...view };
  }
  return null;
}

// Steps shown in the update email.
export const ORDER_STEPS: [OrderStatus, string][] = [["pending", "Placed"], ["confirmed", "Confirmed"], ["packed", "Packed"], ["shipped", "Shipped"], ["delivered", "Delivered"]];
