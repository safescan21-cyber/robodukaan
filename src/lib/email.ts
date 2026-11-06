import "server-only";
import nodemailer from "nodemailer";
import { formatINR } from "./format";
import { REPAIR_STATUS_LABEL } from "./constants";
import type { Order, OrderItem, RepairRequest } from "./types";

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

async function send(to: string, subject: string, html: string, replyTo?: string) {
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
${line("Total (cash on delivery)", formatINR(order.total), true)}</table>`;
}

function address(order: Order) {
  return `<p style="margin:12px 0;padding:12px;background:#f8fafc;border-radius:6px;font-size:14px"><b>${esc(order.customer_name)}</b><br>${esc(order.address_line)}<br>${esc(order.city)}, ${esc(order.state)} – ${esc(order.pincode)}<br>📞 ${esc(order.phone)}</p>`;
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
          `<p>Hi ${esc(r.name.split(" ")[0])}, thanks for sending your board details and photos. Our technician will review them and send you a repair quote, usually within 1–2 working days.</p>${repairSummary(r)}`,
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
        `🔧 New PCB repair request ${r.request_number}`,
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
