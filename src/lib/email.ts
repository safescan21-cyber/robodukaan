import "server-only";
import nodemailer from "nodemailer";
import { formatINR, formatINR2 } from "./format";
import { REPAIR_STATUS_LABEL, SELLER, STORE } from "./constants";
import { invoiceTotals } from "./invoice";
import type { Job, JobApplication, Order, OrderItem, PartnerApplication, QuoteRequest, RepairRequest, Vendor, VendorOrderView } from "./types";

// Emails are sent from this server with the SMTP mailbox set in .env.local
// (deploy/set-email.sh). If SMTP isn't configured, emails are skipped and logged.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function adminEmail() {
  return process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";
}

// Only plain addresses like name@example.com: customers type these into forms, and odd characters
// (quotes, ; , < > ( )) could otherwise trick a mail library into extra recipients.
const PLAIN_EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
export function isPlainEmail(value: string | null | undefined): value is string {
  return !!value && value.length <= 254 && PLAIN_EMAIL.test(value);
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  if (!isPlainEmail(to)) {
    console.warn(`[email] refused unusual address for "${subject}"`);
    return false;
  }
  if (replyTo && !isPlainEmail(replyTo)) replyTo = undefined;
  subject = subject.replace(/[\r\n]+/g, " ").slice(0, 200);
  const t = transport();
  if (!t) {
    console.warn(`[email] SMTP not configured; skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `PCBDukaan <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      replyTo,
    });
    return true;
  } catch (e) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:28px 12px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
<div style="background:#14306f;padding:16px 24px;font-size:22px;font-weight:800;color:#fff">PCB<span style="color:#f97316">Dukaan</span></div>
<div style="padding:24px;color:#0f172a;font-size:15px;line-height:1.55">
<h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
${body}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px">${esc(cta.label)}</a></p>` : ""}
</div></div>
<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:14px">PCBDukaan · <a href="${SITE}" style="color:#94a3b8">${SITE.replace(/^https?:\/\//, "")}</a></p></div>`;
}

function itemsTable(order: Order) {
  const rows = (order.order_items ?? [])
    .map(
      (i: OrderItem) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9">${esc(i.name)} × ${i.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right">${formatINR(i.line_total)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;font-size:16px" : ""}">${label}</td><td style="padding:4px 0;text-align:right;${bold ? "font-weight:700;font-size:16px" : ""}">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">${rows}
${line("Subtotal", formatINR(order.subtotal))}
${Number(order.discount) > 0 ? line(`Discount${order.coupon_code ? ` (${esc(order.coupon_code)})` : ""}`, `− ${formatINR(order.discount)}`) : ""}
${line("Shipping", Number(order.shipping) === 0 ? "Free" : formatINR(order.shipping))}
${Number(order.gst_amount ?? 0) > 0 ? line(`GST (${Number(order.gst_rate)}%)`, formatINR(Number(order.gst_amount))) : ""}
${line("Total (cash on delivery)", formatINR(order.total), true)}</table>`;
}

function address(order: Order) {
  return `<p style="margin:12px 0;padding:12px;background:#f8fafc;border-radius:6px;font-size:14px"><b>${esc(order.customer_name)}</b><br>${esc(order.address_line)}<br>${esc(order.city)}, ${esc(order.state)} – ${esc(order.pincode)}<br>📞 ${esc(order.phone)}${order.buyer_gstin ? `<br>🏢 ${esc(order.buyer_company)} · GSTIN ${esc(order.buyer_gstin)}` : ""}</p>`;
}

export async function sendOrderEmails(order: Order) {
  const results: boolean[] = [];
  if (order.email) {
    results.push(
      await send(
        order.email,
        `Order ${order.order_number} received – PCBDukaan`,
        layout(
          `Thank you for your order, ${order.customer_name.split(" ")[0]}!`,
          `<p>We’ve received your order <b>${esc(order.order_number)}</b> and will call you to confirm it soon. You’ll pay <b>${formatINR(order.total)}</b> in cash or UPI when it arrives.</p>${itemsTable(order)}<p style="margin:12px 0 0;font-weight:600">Delivering to</p>${address(order)}`,
          { label: "View your order", href: `${SITE}/account/orders/${order.id}` },
        ),
        adminEmail() || undefined,
      ),
    );
  }
  const admin = adminEmail();
  if (admin) {
    results.push(
      await send(
        admin,
        `🛒 New order ${order.order_number} – ${formatINR(order.total)}`,
        layout(
          `New order ${order.order_number}`,
          `<p>${esc(order.customer_name)} placed an order for <b>${formatINR(order.total)}</b> (cash on delivery).</p>${itemsTable(order)}${address(order)}${order.notes ? `<p><b>Note:</b> ${esc(order.notes)}</p>` : ""}`,
          { label: "Open in admin", href: `${SITE}/admin/orders/${order.id}` },
        ),
        order.email || undefined,
      ),
    );
  }
  return results.some(Boolean);
}

// Sent when the admin confirms an order: the GST invoice details with every product, plus a link to the
// printable / PDF invoice in the customer's account.
export async function sendInvoiceEmail(order: Order) {
  if (!order.email) return false;
  const tot = invoiceTotals(order);
  const td = "padding:6px 4px;border-bottom:1px solid #e2e8f0;vertical-align:top";
  const rows = (order.order_items ?? [])
    .map((i: OrderItem, n) => `<tr>
<td style="${td}">${n + 1}</td>
<td style="${td}"><b>${esc(i.name)}</b><br><span style="color:#64748b;font-size:12px">SKU ${esc(i.sku)}${i.hsn_code ? ` · HSN ${esc(i.hsn_code)}` : ""}</span></td>
<td style="${td};text-align:center">${i.quantity}</td>
<td style="${td};text-align:right">${formatINR2(i.unit_price)}</td>
<td style="${td};text-align:right">${formatINR2(i.line_total)}</td></tr>`)
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td colspan="4" style="padding:4px;text-align:right;${bold ? "font-weight:700;font-size:16px" : ""}">${label}</td><td style="padding:4px;text-align:right;white-space:nowrap;${bold ? "font-weight:700;font-size:16px" : ""}">${value}</td></tr>`;
  const company = SELLER.companyName || STORE.name;
  const invoiceDate = order.invoice_date ? new Date(order.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const body = `<p>Good news – your order <b>${esc(order.order_number)}</b> is <b>confirmed</b> and is being prepared for dispatch. Here is your invoice.</p>
<table style="width:100%;font-size:14px;margin:8px 0 4px;background:#f8fafc;border-radius:6px"><tr>
<td style="padding:8px"><span style="color:#64748b;font-size:12px">Invoice no.</span><br><b>${esc(order.invoice_number ?? "—")}</b></td>
<td style="padding:8px"><span style="color:#64748b;font-size:12px">Invoice date</span><br><b>${esc(invoiceDate)}</b></td>
<td style="padding:8px"><span style="color:#64748b;font-size:12px">Order no.</span><br><b>${esc(order.order_number)}</b></td></tr></table>
<p style="margin:10px 0 0;font-size:12px;color:#64748b">Sold by <b>${esc(company)}</b>${SELLER.gstin ? ` · GSTIN ${esc(SELLER.gstin)}` : ""}${order.buyer_gstin ? ` → ${esc(order.buyer_company)} · GSTIN ${esc(order.buyer_gstin)}` : ""}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0">
<tr style="background:#14306f;color:#fff;font-size:12px"><th style="padding:6px 4px;text-align:left">#</th><th style="padding:6px 4px;text-align:left">Product</th><th style="padding:6px 4px">Qty</th><th style="padding:6px 4px;text-align:right">Rate</th><th style="padding:6px 4px;text-align:right">Amount</th></tr>
${rows}
${line("Subtotal", formatINR2(tot.subtotal))}
${tot.discount > 0 ? line(`Discount${order.coupon_code ? ` (${esc(order.coupon_code)})` : ""}`, `− ${formatINR2(tot.discount)}`) : ""}
${line("Shipping", tot.shipping === 0 ? "Free" : formatINR2(tot.shipping))}
${tot.taxLines.length ? line("Taxable value", formatINR2(tot.taxable)) : ""}
${tot.taxLines.map(([l, v]) => line(esc(l), formatINR2(v))).join("")}
${line(order.payment_status === "paid" ? "Total (paid)" : order.payment_method === "cod" ? "Total – pay on delivery" : "Total", formatINR2(tot.total), true)}
</table>
<p style="margin:12px 0 0;font-weight:600">Delivering to</p>${address(order)}
<p style="font-size:13px;color:#64748b">Prices in ₹. Open the link below to print or save the full GST tax invoice as PDF. Questions? Just reply to this email.</p>`;
  return send(
    order.email,
    `Order ${order.order_number} confirmed – Invoice ${order.invoice_number ?? ""}`.trim(),
    layout(`Order confirmed, ${order.customer_name.split(" ")[0]}!`, body, { label: "View / download invoice", href: `${SITE}/account/orders/${order.id}/invoice` }),
    adminEmail() || undefined,
  );
}

export async function sendWelcomeEmail(to: string, name: string | null) {
  return send(
    to,
    "Welcome to PCBDukaan",
    layout(
      `Welcome${name ? `, ${name.split(" ")[0]}` : ""}!`,
      `<p>Your PCBDukaan account is ready. Here’s what you can do:</p>
<ul style="padding-left:20px;margin:8px 0">
<li>Buy industrial control boards, SMPS, drive boards, PLC modules, load cells and power components</li>
<li>Pay cash on delivery anywhere in India — free shipping above ₹499</li>
<li>Send us your <b>faulty industrial PCBs</b> for repair — just upload a few photos for a free quote</li>
<li>Track your orders and repair requests from your account</li></ul>
<p>Use code <b>WELCOME10</b> for 10% off your first order.</p>`,
      { label: "Start shopping", href: `${SITE}/products` },
    ),
  );
}

function repairSummary(r: RepairRequest) {
  return `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:4px 0;color:#64748b;width:130px">Request</td><td style="padding:4px 0"><b>${esc(r.request_number)}</b></td></tr>
${r.urgent || r.wants_exchange ? `<tr><td style="padding:4px 0;color:#64748b">Priority</td><td style="padding:4px 0;color:#b91c1c;font-weight:700">${[r.urgent ? "🚨 Machine stopped – urgent" : "", r.wants_exchange ? "🔁 Wants an exchange board" : ""].filter(Boolean).join(" · ")}</td></tr>` : ""}
<tr><td style="padding:4px 0;color:#64748b">Board</td><td style="padding:4px 0">${esc(r.board_type)}${r.device ? ` – ${esc(r.device)}` : ""} × ${r.quantity}</td></tr>
<tr><td style="padding:4px 0;color:#64748b">Problem</td><td style="padding:4px 0">${esc(r.problem)}</td></tr>
<tr><td style="padding:4px 0;color:#64748b">Photos</td><td style="padding:4px 0">${r.photos.length}</td></tr>
<tr><td style="padding:4px 0;color:#64748b">Status</td><td style="padding:4px 0"><b>${esc(REPAIR_STATUS_LABEL[r.status])}</b></td></tr>
${r.quote_amount != null ? `<tr><td style="padding:4px 0;color:#64748b">Repair quote</td><td style="padding:4px 0"><b>${formatINR(r.quote_amount)}</b></td></tr>` : ""}
</table>`;
}

export async function sendRepairReceivedEmails(r: RepairRequest) {
  const results: boolean[] = [];
  if (r.email) {
    results.push(
      await send(
        r.email,
        `PCB repair request ${r.request_number} received`,
        layout(
          "We’ve received your PCB repair request",
          `<p>Hi ${esc(r.name.split(" ")[0])}, thanks for sending your board details and photos. Our technician will review them and send you a repair quote, usually within 1–2 working days.</p>${repairSummary(r)}<p style="font-size:14px">Follow every step of your repair any time: <a href="${SITE}/track?repair=${encodeURIComponent(r.request_number)}">track repair ${esc(r.request_number)}</a> (with your mobile number).</p>`,
          { label: "View your request", href: `${SITE}/account/repairs` },
        ),
        adminEmail() || undefined,
      ),
    );
  }
  const admin = adminEmail();
  if (admin) {
    results.push(
      await send(
        admin,
        `${r.urgent ? "🚨 URGENT " : "🔧 "}New PCB repair request ${r.request_number}${r.wants_exchange ? " (exchange wanted)" : ""}`,
        layout(
          `New PCB repair request ${r.request_number}`,
          `<p>From <b>${esc(r.name)}</b> · 📞 ${esc(r.phone)}${r.email ? ` · ✉️ ${esc(r.email)}` : ""}</p>${repairSummary(r)}`,
          { label: "Open in admin", href: `${SITE}/admin/repairs/${r.id}` },
        ),
        r.email || undefined,
      ),
    );
  }
  return results.some(Boolean);
}

export async function sendRepairUpdateEmail(r: RepairRequest) {
  if (!r.email) return false;
  return send(
    r.email,
    `Update on your PCB repair ${r.request_number}: ${REPAIR_STATUS_LABEL[r.status]}`,
    layout(
      `Your repair request is now: ${REPAIR_STATUS_LABEL[r.status]}`,
      `<p>Hi ${esc(r.name.split(" ")[0])}, here’s the latest on your PCB repair.</p>${repairSummary(r)}${r.admin_notes ? `<p style="padding:12px;background:#fff7ed;border-radius:6px"><b>Message from our technician:</b><br>${esc(r.admin_notes).replace(/\n/g, "<br>")}</p>` : ""}`,
      { label: "View your request", href: `${SITE}/account/repairs` },
    ),
    adminEmail() || undefined,
  );
}

export async function sendJobApplicationEmails(app: JobApplication, job: Pick<Job, "title" | "slug">) {
  const results: boolean[] = [];
  results.push(
    await send(
      app.email,
      `Application received: ${job.title}`,
      layout(
        "Thanks for applying!",
        `<p>Hi ${esc(app.name.split(" ")[0])}, we’ve received your application for <b>${esc(job.title)}</b>. Our team will review it and contact you if your profile matches.</p>`,
        { label: "See other openings", href: `${SITE}/careers` },
      ),
      adminEmail() || undefined,
    ),
  );
  const admin = adminEmail();
  if (admin) {
    results.push(
      await send(
        admin,
        `💼 New job application: ${job.title} – ${app.name}`,
        layout(
          `New application for ${job.title}`,
          `<table style="width:100%;font-size:14px;border-collapse:collapse">
<tr><td style="padding:4px 0;color:#64748b;width:120px">Name</td><td>${esc(app.name)}</td></tr>
<tr><td style="padding:4px 0;color:#64748b">Email</td><td>${esc(app.email)}</td></tr>
<tr><td style="padding:4px 0;color:#64748b">Phone</td><td>${esc(app.phone)}</td></tr>
${app.experience ? `<tr><td style="padding:4px 0;color:#64748b">Experience</td><td>${esc(app.experience)}</td></tr>` : ""}
<tr><td style="padding:4px 0;color:#64748b">CV</td><td>${app.resume_path ? "Attached in admin" : "Not uploaded"}</td></tr></table>
${app.message ? `<p style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px">${esc(app.message).replace(/\n/g, "<br>")}</p>` : ""}`,
          { label: "Open in admin", href: `${SITE}/admin/jobs/${app.job_id}` },
        ),
        app.email,
      ),
    );
  }
  return results.some(Boolean);
}

function quoteSummary(q: QuoteRequest) {
  const row = (k: string, v: string | null | undefined) => (v ? `<tr><td style="padding:4px 0;color:#64748b;width:130px">${k}</td><td style="padding:4px 0">${v}</td></tr>` : "");
  return `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0">
${row("Request", `<b>${esc(q.quote_number)}</b>`)}
${row("Product", esc(q.product_name ?? "—"))}
${row("Quantity", `<b>${q.quantity}</b>`)}
${row("Company", esc(q.company))}
${row("GSTIN", esc(q.gstin))}
${row("City", esc(q.city))}
${row("Message", esc(q.message))}
</table>`;
}

// Bulk quote request: alert to the shop, confirmation to the buyer (if they gave an email).
export async function sendQuoteRequestEmails(q: QuoteRequest) {
  const results: boolean[] = [];
  const admin = adminEmail();
  if (admin) {
    results.push(await send(admin, `💼 Bulk quote request ${q.quote_number}: ${q.quantity} × ${q.product_name ?? "items"}`,
      layout(`Bulk quote request ${q.quote_number}`,
        `<p>From <b>${esc(q.name)}</b>${q.company ? ` (${esc(q.company)})` : ""} · 📞 <a href="tel:+91${esc(q.phone)}">${esc(q.phone)}</a>${q.email ? ` · ✉️ ${esc(q.email)}` : ""}</p>${quoteSummary(q)}`,
        { label: "Open in admin", href: `${SITE}/admin/quotes` }),
      q.email || undefined));
  }
  if (q.email) {
    results.push(await send(q.email, `Your quote request ${q.quote_number} – PCBDukaan`,
      layout("We’ve received your quote request",
        `<p>Hi ${esc(q.name.split(" ")[0])}, thanks for your enquiry. We’ll send you our best price for this quantity, usually within one working day.</p>${quoteSummary(q)}`),
      admin || undefined));
  }
  return results.some(Boolean);
}

// "Back in stock" email for a customer who asked to be notified.
export async function sendBackInStockEmail(to: string, product: { name: string; slug: string; price: number }) {
  return send(to, `Back in stock: ${product.name}`,
    layout("It’s back in stock",
      `<p>Good news – <b>${esc(product.name)}</b> is available again at ${formatINR(product.price)} + GST. Stock can sell out quickly, so order soon.</p>
<p style="font-size:13px;color:#64748b">You asked us to tell you when this product was back. This is a one-time email.</p>`,
      { label: "View product", href: `${SITE}/products/${product.slug}` }));
}

// New technician partner application: admin email + confirmation to the technician.
export async function sendPartnerApplicationEmails(a: Pick<PartnerApplication, "name" | "business_name" | "phone" | "email" | "city" | "state" | "experience" | "message">) {
  const results: boolean[] = [];
  const admin = adminEmail();
  const details = `<table style="font-size:14px;border-collapse:collapse">
${[["Name", a.name], ["Business", a.business_name], ["Mobile", a.phone], ["Email", a.email], ["City", [a.city, a.state].filter(Boolean).join(", ")], ["Experience / boards", a.experience], ["Message", a.message]]
  .filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("")}
</table>`;
  if (admin) {
    results.push(await send(admin, `🤝 New technician partner: ${a.name.replace(/[\r\n]/g, " ")}, ${a.city.replace(/[\r\n]/g, " ")}`,
      layout("New technician partner application", details, { label: "Open in admin", href: `${SITE}/admin/partners` }),
      a.email || undefined));
  }
  if (a.email) {
    results.push(await send(a.email, "Your PCBDukaan partner application",
      layout("Thanks for applying",
        `<p>Hi ${esc(a.name.split(" ")[0])}, thanks for your interest in becoming a PCBDukaan repair partner. We’ll call or WhatsApp you within a few working days to explain how it works.</p>${details}`),
      admin || undefined));
  }
  return results.some(Boolean);
}

// ── Vendors (suppliers who dispatch orders) ─────────────────────────────────────────────────────
function vendorItems(items: { name: string; sku: string; quantity: number }[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
<tr><th style="text-align:left;padding:6px 0;border-bottom:2px solid #e2e8f0">Item</th><th style="text-align:right;padding:6px 0;border-bottom:2px solid #e2e8f0">Qty</th></tr>
${items.map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9">${esc(i.name)}<br><span style="color:#64748b;font-size:12px">SKU ${esc(i.sku)}</span></td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${i.quantity}</td></tr>`).join("")}
</table>`;
}

function vendorShipTo(v: VendorOrderView) {
  const s = v.ship_to;
  return `<p style="margin:12px 0;padding:12px;background:#f8fafc;border-radius:6px;font-size:14px"><b>Ship to:</b><br><b>${esc(s.name)}</b>${s.company ? ` (${esc(s.company)})` : ""}<br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.state)} – ${esc(s.pincode)}<br>📞 ${esc(s.phone)}</p>`;
}

// Admin assigned an order to a vendor: the vendor gets the order and their private link.
export async function sendVendorAssignmentEmail(vendor: Pick<Vendor, "company_name" | "contact_name" | "email">, v: VendorOrderView, link: string) {
  if (!vendor.email) return false;
  const cod = v.cod_amount ? `<p style="margin:12px 0;padding:10px 12px;background:#fff7ed;border-radius:6px"><b>Cash on delivery:</b> collect ${formatINR2(v.cod_amount)} from the customer.</p>` : "";
  return send(vendor.email, `New order to dispatch: ${v.order_number} – PCBDukaan`,
    layout(`New order ${v.order_number} to dispatch`,
      `<p>Hello ${esc(vendor.contact_name || vendor.company_name)},</p>
<p>PCBDukaan has assigned this order to <b>${esc(vendor.company_name)}</b>. Please pack and dispatch it, then mark it dispatched with the courier and tracking number using the button below.</p>
${vendorItems(v.items)}${vendorShipTo(v)}${cod}
${v.admin_note ? `<p style="font-size:14px"><b>Note from PCBDukaan:</b> ${esc(v.admin_note)}</p>` : ""}
${v.notes ? `<p style="font-size:14px"><b>Customer note:</b> ${esc(v.notes)}</p>` : ""}
<p style="font-size:13px;color:#64748b">Keep this email private – the button is your personal link for this order.</p>`,
      { label: "Open order & mark dispatched", href: link }),
    adminEmail() || undefined);
}

// The vendor accepted / declined / dispatched: tell the admin.
export async function sendVendorUpdateToAdmin(v: VendorOrderView, orderId: string | null) {
  const admin = adminEmail();
  if (!admin) return false;
  const what = v.status === "dispatched" ? "dispatched" : v.status === "accepted" ? "accepted" : "DECLINED";
  const body = v.status === "dispatched"
    ? `<p><b>${esc(v.vendor)}</b> has dispatched order <b>${esc(v.order_number)}</b>.</p>
<p style="padding:12px;background:#f0fdf4;border-radius:6px">🚚 Courier: <b>${esc(v.courier)}</b><br>Tracking / AWB: <b>${esc(v.tracking_number)}</b>${v.tracking_url ? `<br><a href="${esc(v.tracking_url)}">Track shipment</a>` : ""}</p>
<p>The order is now marked <b>Shipped</b>.</p>`
    : `<p><b>${esc(v.vendor)}</b> has ${what} order <b>${esc(v.order_number)}</b>.</p>`;
  return send(admin, `${v.status === "declined" ? "⚠️ " : v.status === "dispatched" ? "🚚 " : "✓ "}${v.vendor} ${what} order ${v.order_number}`,
    layout(`Order ${v.order_number} ${what}`,
      `${body}${v.vendor_note ? `<p style="font-size:14px"><b>Vendor note:</b> ${esc(v.vendor_note)}</p>` : ""}${vendorItems(v.items)}`,
      orderId ? { label: "Open order in admin", href: `${SITE}/admin/orders/${orderId}` } : undefined));
}

// Customer: your order is on its way.
export async function sendOrderShippedEmail(to: string | null | undefined, v: VendorOrderView) {
  if (!to) return false;
  return send(to, `Your PCBDukaan order ${v.order_number} has been shipped`,
    layout("Your order is on its way 🚚",
      `<p>Hi ${esc(v.ship_to.name.split(" ")[0])}, your order <b>${esc(v.order_number)}</b> has been shipped.</p>
<p style="padding:12px;background:#f8fafc;border-radius:6px">Courier: <b>${esc(v.courier)}</b><br>Tracking / AWB number: <b>${esc(v.tracking_number)}</b></p>
${vendorItems(v.items)}`,
      v.tracking_url ? { label: "Track your shipment", href: v.tracking_url } : { label: "View your order", href: `${SITE}/account/orders` }));
}
