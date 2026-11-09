// Bulk product upload (admin → Products → Bulk upload): reads a CSV saved from Excel / Google Sheets,
// checks every row and turns it into product records. Pure functions – no network – so they are easy to test.
import { slugify } from "./format";

export const IMPORT_COLUMNS = [
  "sku", "name", "brand", "category", "price", "mrp", "stock", "short_description", "description",
  "specs", "equivalents", "hsn_code", "bis_number", "country_of_origin", "manufacturer", "warranty_months", "new_arrival", "ready_to_dispatch", "active", "photos",
] as const;
type Column = (typeof IMPORT_COLUMNS)[number];

// Other header spellings people use → our column names.
const ALIASES: Record<string, Column> = {
  product: "name", product_name: "name", title: "name", item: "name",
  part_number: "sku", part_no: "sku", model: "sku", code: "sku",
  make: "brand",
  origin: "country_of_origin", country: "country_of_origin", made_in: "country_of_origin", coo: "country_of_origin",
  manufacturer_name: "manufacturer", manufactured_by: "manufacturer", importer: "manufacturer", manufacturer_importer: "manufacturer",
  category_slug: "category", category_name: "category",
  selling_price: "price", rate: "price", "price_(₹)": "price", price_inr: "price",
  quantity: "stock", qty: "stock",
  short_description_: "short_description", summary: "short_description",
  specifications: "specs", specification: "specs",
  replaces: "equivalents", replaces_part_numbers: "equivalents",
  hsn: "hsn_code", bis: "bis_number", bis_registration: "bis_number",
  warranty: "warranty_months", warranty_month: "warranty_months",
  new: "new_arrival", is_new_arrival: "new_arrival",
  ready: "ready_to_dispatch", is_active: "active", show_on_site: "active",
  images: "photos", image: "photos", photo: "photos", image_files: "photos", pictures: "photos",
};

// ── CSV ────────────────────────────────────────────────────────────────────────────
// RFC 4180: quoted fields, "" inside quotes, line breaks inside quotes, comma / semicolon / tab separated.
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const sep = counts.sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

// ── Rows → products ────────────────────────────────────────────────────────────────
export type ImportCategory = { id: number; slug: string; name: string };
export type ExistingProduct = { id: string; sku: string; slug: string; images: string[] | null };
export type ImportPhoto = { name: string };

export type PlannedRow = {
  line: number;                 // spreadsheet row number (header = 1)
  sku: string;
  name: string;
  action: "create" | "update" | "error";
  errors: string[];
  existingId?: string;
  values?: Record<string, unknown>;   // product fields (without images)
  photoFiles: string[];         // photo file names to upload (matched from the chosen photos)
  photoUrls: string[];          // photo links written in the sheet
  missingPhotos: string[];      // names in the sheet that weren't among the chosen photos
};

const norm = (h: string) => h.trim().toLowerCase().replace(/[\s.-]+/g, "_").replace(/[^a-z0-9_()₹]/g, "");
const yes = (v: string) => /^(y|yes|true|1|haan|ha)$/i.test(v.trim());
const no = (v: string) => /^(n|no|false|0|nahi)$/i.test(v.trim());
const baseName = (f: string) => f.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]+$/i, "").toLowerCase();

function parseNumber(v: string): number | null {
  const s = v.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// "Voltage: 24 V; Current: 5 A"  or one per line  →  { Voltage: "24 V", Current: "5 A" }
export function parseSpecs(v: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of v.split(/[;\n|]+/)) {
    const i = part.search(/[:=]/);
    if (i > 0) {
      const k = part.slice(0, i).trim();
      const val = part.slice(i + 1).trim();
      if (k && val) out[k.slice(0, 60)] = val.slice(0, 200);
    }
  }
  return out;
}

export function planImport(
  table: string[][],
  categories: ImportCategory[],
  existing: ExistingProduct[],
  photos: ImportPhoto[],
): { rows: PlannedRow[]; unknownColumns: string[]; error?: string } {
  if (table.length < 2) return { rows: [], unknownColumns: [], error: "The file has no product rows. Fill in the template below the header row." };
  const header = table[0].map((h) => {
    const n = norm(h);
    return (IMPORT_COLUMNS as readonly string[]).includes(n) ? (n as Column) : ALIASES[n] ?? null;
  });
  if (!header.includes("sku") || !header.includes("name")) {
    return { rows: [], unknownColumns: [], error: "The first row must be the header with at least the columns sku and name. Download the template to start." };
  }
  const unknownColumns = table[0].filter((_, i) => !header[i] && table[0][i].trim());
  const bySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p]));
  const usedSlugs = new Map(existing.map((p) => [p.slug, p.sku.toUpperCase()]));
  const seenSkus = new Set<string>();
  const photoByName = new Map(photos.map((p) => [p.name.toLowerCase(), p.name]));
  const photoByBase = new Map<string, string[]>();
  for (const p of photos) {
    const b = baseName(p.name);
    photoByBase.set(b, [...(photoByBase.get(b) ?? []), p.name]);
  }
  const findCategory = (v: string) => {
    const s = v.trim().toLowerCase();
    if (!s) return undefined;
    return categories.find((c) => c.slug === s || c.name.toLowerCase() === s || slugify(c.name) === slugify(s) || String(c.id) === s);
  };

  const rows: PlannedRow[] = table.slice(1).map((cells, idx) => {
    const get = (col: Column) => {
      const i = header.indexOf(col);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };
    const has = (col: Column) => header.includes(col) && get(col) !== "";
    const sku = get("sku").toUpperCase().replace(/\s+/g, "-");
    const name = get("name").replace(/\s+/g, " ");
    const row: PlannedRow = { line: idx + 2, sku, name, action: "create", errors: [], photoFiles: [], photoUrls: [], missingPhotos: [] };
    const err = (m: string) => row.errors.push(m);
    const current = bySku.get(sku);
    if (current) { row.action = "update"; row.existingId = current.id; }

    if (!sku) err("SKU is empty");
    else if (!/^[A-Z0-9][A-Z0-9_./+-]{0,59}$/.test(sku)) err("SKU may only use letters, numbers and - _ . / +");
    else if (seenSkus.has(sku)) err("This SKU appears twice in the file");
    seenSkus.add(sku);
    if (!current && name.length < 3) err("Name is missing");

    const values: Record<string, unknown> = {};
    if (name.length >= 3) values.name = name.slice(0, 200);

    if (has("category") || !current) {
      const cat = findCategory(get("category"));
      if (!cat) err(get("category") ? `Unknown category “${get("category")}”` : "Category is missing");
      else values.category_id = cat.id;
    }
    if (has("price") || !current) {
      const price = parseNumber(get("price"));
      if (price == null) err("Price is missing");
      else if (Number.isNaN(price) || price <= 0) err(`Price “${get("price")}” is not a number above 0`);
      else values.price = Math.round(price * 100) / 100;
    }
    if (has("mrp")) {
      const mrp = parseNumber(get("mrp"));
      if (mrp == null || Number.isNaN(mrp) || mrp < 0) err(`MRP “${get("mrp")}” is not a number`);
      else if (typeof values.price === "number" && mrp > 0 && mrp < values.price) err("MRP is lower than the price");
      else values.mrp = mrp > 0 ? Math.round(mrp * 100) / 100 : null;
    }
    for (const [col, field, max] of [["stock", "stock", 1_000_000], ["warranty_months", "warranty_months", 120]] as const) {
      if (has(col)) {
        const n = parseNumber(get(col));
        if (n == null || Number.isNaN(n) || n < 0 || n > max || !Number.isInteger(n)) err(`${col.replace("_", " ")} “${get(col)}” must be a whole number`);
        else values[field] = n;
      } else if (!current) values[field] = 0;
    }
    if (has("brand") || !current) values.brand = get("brand").slice(0, 80) || null;
    if (has("short_description")) values.short_description = get("short_description").slice(0, 200);
    if (has("description")) values.description = get("description").slice(0, 20000);
    if (has("specs")) {
      const specs = parseSpecs(get("specs"));
      if (!Object.keys(specs).length) err("Specs must look like “Voltage: 24 V; Current: 5 A”");
      else values.specs = specs;
    }
    // Columns added by later database updates are only sent when filled in.
    if (has("equivalents")) values.equivalents = get("equivalents").slice(0, 500);
    if (has("hsn_code")) {
      const hsn = get("hsn_code").replace(/\s/g, "");
      if (!/^\d{4,8}$/.test(hsn)) err(`HSN code “${get("hsn_code")}” must be 4–8 digits`);
      else values.hsn_code = hsn;
    }
    if (has("bis_number")) values.bis_number = get("bis_number").toUpperCase().slice(0, 40);
    if (has("country_of_origin")) values.country_of_origin = get("country_of_origin").slice(0, 60);
    if (has("manufacturer")) values.manufacturer = get("manufacturer").slice(0, 300);
    for (const [col, field] of [["new_arrival", "is_new_arrival"], ["ready_to_dispatch", "ready_to_dispatch"], ["active", "is_active"]] as const) {
      if (has(col)) {
        if (yes(get(col))) values[field] = true;
        else if (no(get(col))) values[field] = false;
        else err(`${col.replace(/_/g, " ")} must be yes or no`);
      }
    }
    if (!current && values.is_active === undefined) values.is_active = true;

    // Photos: names/links from the sheet, otherwise chosen photos named after the SKU (SKU.jpg, SKU-2.jpg …).
    const listed = get("photos").split(/[,;|\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const p of listed) {
      if (/^https?:\/\//i.test(p)) row.photoUrls.push(p);
      else {
        const hit = photoByName.get(p.toLowerCase()) ?? photoByBase.get(baseName(p))?.[0];
        if (hit) row.photoFiles.push(hit); else row.missingPhotos.push(p);
      }
    }
    if (!listed.length && sku) {
      const key = sku.toLowerCase();
      const matches = photos.map((p) => p.name).filter((n) => {
        const b = baseName(n);
        return b === key || b.startsWith(`${key}-`) || b.startsWith(`${key}_`) || b.startsWith(`${key} `);
      }).sort((a, b) => baseName(a).length - baseName(b).length || a.localeCompare(b, undefined, { numeric: true }));
      row.photoFiles.push(...matches);
    }
    if (row.photoFiles.length + row.photoUrls.length > 10) err("At most 10 photos per product");

    if (!current && name.length >= 3 && sku) {
      let slug = slugify(name) || slugify(sku);
      const owner = usedSlugs.get(slug);
      if (owner && owner !== sku) slug = `${slug}-${slugify(sku)}`.slice(0, 80);
      usedSlugs.set(slug, sku);
      values.slug = slug;
    }
    if (row.errors.length) row.action = "error";
    else row.values = values;
    return row;
  });
  return { rows, unknownColumns };
}

export const TEMPLATE_ROWS: string[][] = [
  [...IMPORT_COLUMNS],
  ["MW-EDR-120-24", "Mean Well EDR-120-24 DIN-rail SMPS 24V 5A 120W", "Mean Well", "smps-power-supplies", "2150", "2600", "15",
    "Genuine Mean Well 24 V 5 A DIN-rail power supply", "Industrial DIN-rail SMPS for control panels.",
    "Output: 24 V DC; Current: 5 A; Power: 120 W; Input: 88–264 V AC", "Omron S8VK-G12024", "85044090", "R-41000000", "Taiwan", "Mean Well Enterprises, New Taipei, Taiwan", "12", "yes", "yes", "yes", "MW-EDR-120-24.jpg"],
  ["SSR-40DA", "40A solid state relay SSR-40DA (3–32 V DC control)", "Fotek", "relays-power-components", "320", "", "50",
    "", "", "Load: 24–380 V AC; Current: 40 A; Control: 3–32 V DC", "", "85364900", "", "", "", "6", "no", "yes", "yes", ""],
];
