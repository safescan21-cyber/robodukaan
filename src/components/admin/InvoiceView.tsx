import { SELLER, STORE } from "@/lib/constants";
import { formatDate, formatINR2, rupeesInWords } from "@/lib/format";
import type { Order } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

// GST tax invoice for one order (A4, print-friendly). Seller details come from SELLER in lib/constants.
export function InvoiceView({ order }: { order: Order }) {
  const items = order.order_items ?? [];
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const shipping = Number(order.shipping);
  const taxable = round2(subtotal - discount + shipping);
  const rate = Number(order.gst_rate ?? 0);
  const gst = Number(order.gst_amount ?? 0);

  // Same state as the seller → CGST + SGST; other state → IGST. Unknown seller state → one GST line.
  const sameState = SELLER.state && SELLER.state.toLowerCase() === order.state.toLowerCase();
  const taxLines: [string, number][] = !rate
    ? []
    : !SELLER.state
      ? [[`GST @ ${rate}%`, gst]]
      : sameState
        ? [[`CGST @ ${rate / 2}%`, round2(gst / 2)], [`SGST @ ${rate / 2}%`, round2(gst - round2(gst / 2))]]
        : [[`IGST @ ${rate}%`, gst]];

  const company = SELLER.companyName || STORE.name;
  const issued = Boolean(order.invoice_number);
  const cell = "border border-slate-300 px-2 py-1.5";

  return (
      <div className="relative mx-auto max-w-[800px] overflow-x-auto bg-white p-6 text-[13px] leading-snug text-slate-900 ring-1 ring-slate-200 print:max-w-none print:overflow-visible print:p-0 print:ring-0">
        <div className="min-w-[640px] print:min-w-0">
          {order.status === "cancelled" && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-black tracking-widest text-red-500/15 [transform:rotate(-25deg)]">CANCELLED</div>
          )}

          <div className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-3">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
              <div>
              <p className="text-xl font-bold">{company}</p>
              {SELLER.address && <p className="whitespace-pre-line text-slate-700">{SELLER.address}</p>}
              {SELLER.state && <p className="text-slate-700">State: {SELLER.state}</p>}
              <p className="text-slate-700">{STORE.email}{STORE.phone ? ` · ${STORE.phone}` : ""} · pcbdukaan.com</p>
              {SELLER.gstin && <p className="font-semibold">GSTIN: {SELLER.gstin}</p>}
              {SELLER.pan && <p>PAN: {SELLER.pan}</p>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {issued ? (
                <>
                  <p className="text-lg font-bold tracking-wide">TAX INVOICE</p>
                  <p className="text-xs text-slate-500">Original for recipient</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold tracking-wide text-amber-700">DRAFT</p>
                  <p className="text-xs text-slate-500">Not a tax invoice — number not issued</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-slate-300 py-3">
            <dl className="grid content-start grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-slate-500">Invoice no.</dt><dd className="font-mono font-semibold">{order.invoice_number ?? "—"}</dd>
              <dt className="text-slate-500">Invoice date</dt><dd>{order.invoice_date ? formatDate(`${order.invoice_date}T12:00:00`) : "—"}</dd>
              <dt className="text-slate-500">Order no.</dt><dd className="font-mono">{order.order_number}</dd>
              <dt className="text-slate-500">Order date</dt><dd>{formatDate(order.created_at)}</dd>
            </dl>
            <dl className="grid content-start grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-slate-500">Place of supply</dt><dd>{order.state}</dd>
              <dt className="text-slate-500">Payment</dt><dd>{order.payment_method === "cod" ? "Cash on delivery" : order.payment_method} ({order.payment_status})</dd>
              {order.coupon_code && <><dt className="text-slate-500">Coupon</dt><dd>{order.coupon_code}</dd></>}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-slate-300 py-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Bill to</p>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="whitespace-pre-line">{order.address_line}</p>
              <p>{order.city}, {order.state} – {order.pincode}</p>
              <p>Mobile: {order.phone}{order.email ? ` · ${order.email}` : ""}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Ship to</p>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="whitespace-pre-line">{order.address_line}</p>
              <p>{order.city}, {order.state} – {order.pincode}</p>
            </div>
          </div>

          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase">
                <th className={`${cell} w-8`}>#</th>
                <th className={cell}>Description</th>
                <th className={`${cell} w-20`}>HSN</th>
                <th className={`${cell} w-12 text-right`}>Qty</th>
                <th className={`${cell} w-28 text-right`}>Rate</th>
                <th className={`${cell} w-28 text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className="break-inside-avoid">
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{it.name}<span className="block text-xs text-slate-500">SKU: {it.sku}</span></td>
                  <td className={cell}>{it.hsn_code || "—"}</td>
                  <td className={`${cell} text-right`}>{it.quantity}</td>
                  <td className={`${cell} text-right`}>{formatINR2(it.unit_price)}</td>
                  <td className={`${cell} text-right`}>{formatINR2(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex justify-end break-inside-avoid">
            <table className="w-80 border-collapse">
              <tbody>
                <tr><td className={cell}>Subtotal</td><td className={`${cell} text-right`}>{formatINR2(subtotal)}</td></tr>
                {discount > 0 && <tr><td className={cell}>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</td><td className={`${cell} text-right`}>− {formatINR2(discount)}</td></tr>}
                <tr><td className={cell}>Shipping</td><td className={`${cell} text-right`}>{formatINR2(shipping)}</td></tr>
                <tr className="font-semibold"><td className={cell}>Taxable value</td><td className={`${cell} text-right`}>{formatINR2(taxable)}</td></tr>
                {taxLines.map(([label, amount]) => <tr key={label}><td className={cell}>{label}</td><td className={`${cell} text-right`}>{formatINR2(amount)}</td></tr>)}
                <tr className="bg-slate-100 text-base font-bold"><td className={cell}>Total</td><td className={`${cell} text-right`}>{formatINR2(order.total)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 border-y border-slate-300 py-2"><span className="text-slate-500">Amount in words: </span><span className="font-semibold">{rupeesInWords(Number(order.total))}</span></p>

          <div className="mt-6 flex items-end justify-between gap-6 break-inside-avoid">
            <p className="max-w-md text-xs text-slate-600">
              Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              <span className="mt-1 block">This is a computer-generated invoice.</span>
            </p>
            <div className="shrink-0 text-center">
              <p className="font-semibold">For {company}</p>
              <div className="h-14" />
              <p className="border-t border-slate-400 px-6 pt-1 text-xs">Authorised signatory</p>
            </div>
          </div>
        </div>
      </div>
  );
}
