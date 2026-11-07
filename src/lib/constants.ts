import type { JobApplicationStatus, OrderStatus, RepairStatus } from "./types";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  packed: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export const CATEGORY_ICONS = ["pcb", "power", "scale", "chip", "sensor", "motor", "drone", "battery", "display", "wifi", "component", "wrench", "kit"];

export const STORE = {
  name: "PCBDukaan",
  // Leave empty to hide the phone number everywhere on the site (e.g. "+91 97739 10846").
  phone: "",
  // WhatsApp number with country code, digits only (e.g. "919773910846"). Empty hides all WhatsApp buttons.
  whatsapp: "",
  email: "sonugiri@pcbdukaan.in",
};

// Repair promises shown on every repair page. Change them here and the whole site follows.
// warrantyMonths: 0 hides the warranty line. testVideo: false hides the "test video" promise.
export const REPAIR_TERMS = {
  warrantyMonths: 6,
  testVideo: true,
};

export const REPAIR_STATUSES: RepairStatus[] = [
  "new", "reviewing", "quoted", "approved", "in_repair", "repaired", "returned", "rejected", "cancelled",
];

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  new: "Received",
  reviewing: "Under review",
  quoted: "Quote sent",
  approved: "Approved – send the board",
  in_repair: "Repair in progress",
  repaired: "Repaired",
  returned: "Shipped back",
  rejected: "Not repairable",
  cancelled: "Cancelled",
};

export const REPAIR_STATUS_STYLE: Record<RepairStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  reviewing: "bg-sky-100 text-sky-800",
  quoted: "bg-violet-100 text-violet-800",
  approved: "bg-indigo-100 text-indigo-800",
  in_repair: "bg-blue-100 text-blue-800",
  repaired: "bg-emerald-100 text-emerald-800",
  returned: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
};

export const BOARD_TYPES = [
  "Inverter / UPS board",
  "SMPS / power supply",
  "Motor drive / VFD",
  "PLC / industrial controller",
  "Machine control board",
  "Weighing / load cell indicator",
  "Appliance board (AC, washing machine, fridge)",
  "LED driver / lighting",
  "Arduino / ESP / custom PCB",
  "Other",
];

export const APPLICATION_STATUS_LABEL: Record<JobApplicationStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  interview: "Interview",
  rejected: "Not selected",
  hired: "Hired",
};

export const APPLICATION_STATUS_STYLE: Record<JobApplicationStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  shortlisted: "bg-sky-100 text-sky-800",
  interview: "bg-violet-100 text-violet-800",
  rejected: "bg-slate-200 text-slate-700",
  hired: "bg-emerald-100 text-emerald-800",
};

// Seller details printed on tax invoices (Admin → Orders → Print invoice).
// Fill these in when ready; empty fields are simply left off the invoice.
export const SELLER = {
  companyName: "PCBDukaan Pvt Ltd", // legal company name (empty → "PCBDukaan")
  gstin: "", // 15-character GSTIN
  address: "", // full address, use \n for new lines
  state: "", // seller's state (must match a name in INDIAN_STATES); decides CGST+SGST vs IGST
  pan: "",
};
