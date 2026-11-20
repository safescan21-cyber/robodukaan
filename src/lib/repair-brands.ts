// "Brand + repair" pages (e.g. /pcb-repair/vfd-drive-repair/yaskawa) – people search "Yaskawa VFD repair",
// "Delta servo drive repair", "Siemens PLC repair". Each page links the brand's error codes where we have them.
import { DRIVE_BRANDS, type DriveBrand } from "./fault-codes";

export type RepairBrand = {
  service: string;     // REPAIR_SERVICES slug
  slug: string;        // brand part of the URL
  brand: string;       // display name
  noun: string;        // "VFD", "servo drive", "PLC", "HMI", "SMPS"
  series: string;
  faultBrand?: string; // DRIVE_BRANDS slug with error codes
};

const vfdName: Record<string, string> = { "allen-bradley": "Allen-Bradley PowerFlex", ls: "LS (LSIS)" };
const servoName: Record<string, string> = {
  "delta-servo": "Delta", "yaskawa-servo": "Yaskawa", "mitsubishi-servo": "Mitsubishi", "panasonic-servo": "Panasonic",
};

const fromDrive = (b: DriveBrand): RepairBrand =>
  b.kind === "servo"
    ? { service: "servo-drive-repair", slug: b.slug.replace(/-servo$/, ""), brand: servoName[b.slug] ?? b.brand, noun: "servo drive", series: b.series, faultBrand: b.slug }
    : { service: "vfd-drive-repair", slug: b.slug, brand: vfdName[b.slug] ?? b.brand, noun: "VFD", series: b.series, faultBrand: b.slug };

export const REPAIR_BRANDS: RepairBrand[] = [
  ...DRIVE_BRANDS.map(fromDrive),
  { service: "plc-repair", slug: "siemens", brand: "Siemens", noun: "PLC", series: "S7-200, S7-200 SMART, S7-1200, S7-300, LOGO!" },
  { service: "plc-repair", slug: "allen-bradley", brand: "Allen-Bradley", noun: "PLC", series: "MicroLogix, CompactLogix, SLC 500" },
  { service: "plc-repair", slug: "mitsubishi", brand: "Mitsubishi", noun: "PLC", series: "FX3U, FX3G, FX5U, Q series" },
  { service: "plc-repair", slug: "omron", brand: "Omron", noun: "PLC", series: "CP1E, CP1H, CJ2M" },
  { service: "plc-repair", slug: "delta", brand: "Delta", noun: "PLC", series: "DVP-ES2, DVP-SS2, AS series" },
  { service: "plc-repair", slug: "schneider", brand: "Schneider", noun: "PLC", series: "Modicon M221, M241, TM series" },
  { service: "hmi-repair", slug: "delta", brand: "Delta", noun: "HMI", series: "DOP-B, DOP-100 series" },
  { service: "hmi-repair", slug: "siemens", brand: "Siemens", noun: "HMI", series: "KTP, TP, Comfort Panels" },
  { service: "hmi-repair", slug: "weintek", brand: "Weintek", noun: "HMI", series: "MT8000, cMT series" },
  { service: "hmi-repair", slug: "mitsubishi", brand: "Mitsubishi", noun: "HMI", series: "GOT1000, GOT2000" },
  { service: "hmi-repair", slug: "schneider", brand: "Schneider", noun: "HMI", series: "Magelis, Harmony GXU / GTU" },
  { service: "smps-repair", slug: "mean-well", brand: "Mean Well", noun: "SMPS", series: "LRS, NDR, SDR, HRP series" },
  { service: "smps-repair", slug: "delta", brand: "Delta", noun: "SMPS", series: "DRP, PMC, CliQ series" },
  { service: "smps-repair", slug: "omron", brand: "Omron", noun: "SMPS", series: "S8VK, S8FS series" },
  { service: "smps-repair", slug: "siemens", brand: "Siemens SITOP", noun: "SMPS", series: "SITOP PSU, SITOP smart" },
  { service: "smps-repair", slug: "phoenix-contact", brand: "Phoenix Contact", noun: "SMPS", series: "QUINT, TRIO, STEP" },
];

export const brandsForService = (service: string) => REPAIR_BRANDS.filter((b) => b.service === service);
export const getRepairBrand = (service: string, slug: string) => REPAIR_BRANDS.find((b) => b.service === service && b.slug === slug);
export const repairBrandForFaultBrand = (faultSlug: string) => REPAIR_BRANDS.find((b) => b.faultBrand === faultSlug);
