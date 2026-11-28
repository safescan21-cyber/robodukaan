// CNC machine finder & comparison. The data (cnc-machines-data.ts) is taken from each manufacturer's own
// published spec pages – every machine keeps its source link – and is shown as published.
import { CNC_DATA_CHECKED, CNC_MACHINES, CNC_MAKERS } from "./cnc-machines-data";

export type CncType = "vmc" | "hmc" | "5axis" | "drill-tap" | "turning" | "vtl";
export type CncSpecs = Partial<Record<SpecKey, string>>;
// partial = the maker publishes only key data openly (e.g. DMG MORI shows the full sheet only after login).
export type CncMachine = { slug: string; maker: string; model: string; series: string; type: string; source: string; specs: CncSpecs; partial?: boolean };
export type CncMaker = { name: string; country: string; site: string };

export const TYPE_LABEL: Record<CncType, string> = {
  vmc: "Vertical machining centre (VMC)",
  hmc: "Horizontal machining centre (HMC)",
  "5axis": "5-axis machining centre",
  "drill-tap": "Drill-tap / compact centre",
  turning: "CNC turning centre (lathe)",
  vtl: "Vertical turning lathe (VTL)",
};
export const TYPE_SHORT: Record<CncType, string> = { vmc: "VMC", hmc: "HMC", "5axis": "5-axis", "drill-tap": "Drill-tap", turning: "Turning", vtl: "VTL" };

export type SpecKey =
  | "x_travel" | "y_travel" | "z_travel" | "table_size" | "table_load" | "spindle_taper" | "max_rpm" | "spindle_power"
  | "rapid" | "feed" | "tools" | "tool_change" | "tool_shank" | "positioning" | "repeatability" | "weight"
  | "swing" | "max_turn_dia" | "max_turn_len" | "chuck" | "bar_capacity" | "guideways"
  | "workpiece" | "a_axis" | "b_axis" | "c_axis" | "controls";

// Rows of the comparison table, in order. `better` marks which way is better for highlighting.
export const SPEC_ROWS: { key: SpecKey; label: string; better?: "high" | "low"; turning?: boolean; milling?: boolean }[] = [
  { key: "swing", label: "Swing over bed", better: "high", turning: true },
  { key: "max_turn_dia", label: "Max. turning diameter", better: "high", turning: true },
  { key: "max_turn_len", label: "Max. turning length", better: "high", turning: true },
  { key: "chuck", label: "Chuck size", turning: true },
  { key: "bar_capacity", label: "Bar capacity", better: "high", turning: true },
  { key: "x_travel", label: "X travel", better: "high" },
  { key: "y_travel", label: "Y travel", better: "high", milling: true },
  { key: "z_travel", label: "Z travel", better: "high" },
  { key: "a_axis", label: "A axis (tilt / rotary)", milling: true },
  { key: "b_axis", label: "B axis", milling: true },
  { key: "c_axis", label: "C axis", milling: true },
  { key: "table_size", label: "Table / pallet size", milling: true },
  { key: "workpiece", label: "Max. workpiece size", milling: true },
  { key: "table_load", label: "Max. table load", better: "high", milling: true },
  { key: "spindle_taper", label: "Spindle taper / nose" },
  { key: "max_rpm", label: "Max. spindle speed", better: "high" },
  { key: "spindle_power", label: "Spindle power" },
  { key: "rapid", label: "Rapid traverse", better: "high" },
  { key: "feed", label: "Cutting feed" },
  { key: "tools", label: "Tools / turret stations", better: "high" },
  { key: "tool_change", label: "Tool change time", better: "low" },
  { key: "tool_shank", label: "Tool shank size", turning: true },
  { key: "positioning", label: "Positioning accuracy", better: "low" },
  { key: "repeatability", label: "Repeatability", better: "low" },
  { key: "weight", label: "Machine weight (approx.)" },
  { key: "controls", label: "CNC controls offered" },
];

export { CNC_DATA_CHECKED, CNC_MAKERS };
export const MACHINES = CNC_MACHINES as CncMachine[];

export const isTurning = (t: string) => t === "turning" || t === "vtl";
export const getMachine = (slug: string) => MACHINES.find((m) => m.slug === slug);
export const makerName = (m: Pick<CncMachine, "maker">) => CNC_MAKERS[m.maker]?.name ?? m.maker;
export const fullName = (m: CncMachine) => `${makerName(m).split(" (")[0]} ${m.model}`;

// First number in a published value ("10,000(12,000) rpm" → 10000, "40/40/32 m/min" → 40). For sorting and filters.
export function num(v?: string): number | null {
  if (!v) return null;
  const m = v.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// Number for comparing one spec across makers: rapid/feed in m/min (Makino publishes mm/min), "15K" rpm = 15,000.
export function specNum(key: SpecKey, v?: string): number | null {
  if (!v) return null;
  const clean = v.replace(/^0-/, "");
  if (key === "max_rpm") {
    const k = clean.match(/(\d+(?:\.\d+)?)\s*K\b/i);
    if (k) return Number(k[1]) * 1000;
  }
  const n = num(clean);
  if (n !== null && (key === "rapid" || key === "feed") && /mm\s*\/\s*min/i.test(clean) && n >= 1000) return n / 1000;
  return n;
}

// Compact list for the finder page (client side).
export function finderItems() {
  return MACHINES.map((m) => ({
    s: m.slug, mk: m.maker, mn: makerName(m).split(" (")[0], md: m.model, sr: m.series, t: m.type,
    x: num(m.specs.x_travel ?? m.specs.max_turn_dia), y: num(m.specs.y_travel), z: num(m.specs.z_travel ?? m.specs.max_turn_len),
    rpm: specNum("max_rpm", m.specs.max_rpm), tools: num(m.specs.tools), taper: m.specs.spindle_taper ?? "",
  }));
}
export type FinderItem = ReturnType<typeof finderItems>[number];

// For a comparison row: indexes of the best value(s), when the values are comparable numbers.
export function bestIndexes(values: (string | undefined)[], better?: "high" | "low", key?: SpecKey) {
  if (!better) return [];
  const nums = values.map((v) => (key ? specNum(key, v) : num(v?.replace(/^0-/, ""))));
  const valid = nums.filter((n): n is number => n !== null);
  if (valid.length < 2 || new Set(valid).size < 2) return [];
  const target = better === "high" ? Math.max(...valid) : Math.min(...valid);
  return nums.flatMap((n, i) => (n === target ? [i] : []));
}
