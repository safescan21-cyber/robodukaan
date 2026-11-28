"""Build src/lib/cnc-machines-data.ts from the parsed manufacturer pages (raw/*.txt)."""
import json
import re
import subprocess
import sys

sys.path.insert(0, ".")
from parse import parse  # noqa: E402

# file, type, maker slug, series name, variant filter (regex or None = all), model name prefix
SOURCES = [
    ("jyoti-px", "vmc", "jyoti", "PX nvu series", None, ""),
    ("jyoti-rdx", "vmc", "jyoti", "RDX series", None, ""),
    ("jyoti-rxrax", "vmc", "jyoti", "RX series", None, ""),
    ("jyoti-vmcperf", "vmc", "jyoti", "VMC Performance series", None, ""),
    ("jyoti-milltap", "drill-tap", "jyoti", "Mill Tap series", None, ""),
    ("jyoti-tachyon", "drill-tap", "jyoti", "Tachyon series", None, ""),
    ("jyoti-hx", "hmc", "jyoti", "HX series", None, ""),
    ("jyoti-hp", "hmc", "jyoti", "HP series", None, ""),
    ("jyoti-umill", "5axis", "jyoti", "U Mill series", None, ""),
    ("jyoti-ax", "turning", "jyoti", "AX series", None, ""),
    ("jyoti-dx", "turning", "jyoti", "DX series", None, ""),
    ("jyoti-vtl", "vtl", "jyoti", "VTL series", None, ""),
    ("bfw-bmv45", "vmc", "bfw", "BMV 45++ (Agni+)", r"^BMV45\+\+TC(24|30)$", ""),
    ("bfw-bmv50", "vmc", "bfw", "BMV 50", r"TC", ""),
    ("bfw-bmv60", "vmc", "bfw", "BMV 60+", r"TC", ""),
    ("bfw-bmv65", "vmc", "bfw", "BMV 65 / 65+", r"TC", ""),
    ("bfw-bmvpro", "vmc", "bfw", "BMV Pro", r"^9500 HS$", "BMV Pro "),
    ("bfw-helix", "turning", "bfw", "Helix (HTL series)", None, ""),
    ("bfw-rhino", "turning", "bfw", "Rhino / BHT (HTL series)", None, ""),
    ("bfw-bvl500h", "vtl", "bfw", "BVL turret-type VTL", None, "BVL "),
]

# Makino pages: one metric block "Table: …", "X: … Y: … Z: …", then label / value lines.
MAKINO = [
    ("makino-ps65", "vmc", "PS65", "PS series"), ("makino-ps105", "vmc", "PS105", "PS series"),
    ("makino-slim3n", "vmc", "Slim3n", "Slim series"), ("makino-v-slim5n-table", "vmc", "Slim5n", "Slim series"),
    ("makino-f5", "vmc", "F5", "F series"), ("makino-v-f8", "vmc", "F8", "F series"), ("makino-v-f9", "vmc", "F9", "F series"),
    ("makino-v-l2-table", "vmc", "L2", "L series"), ("makino-v-iq300", "vmc", "iQ300", "iQ series (micro milling)"),
    ("makino-v-iq500", "vmc", "iQ500", "iQ series (micro milling)"),
    ("makino-h-a71nx", "hmc", "a71nx", "a-nx series"), ("makino-h-a81nx", "hmc", "a81nx", "a-nx series"),
    ("makino-h-a120nx", "hmc", "a120nx", "a-nx series"), ("makino-h-j5", "hmc", "J5", "J series"), ("makino-h-j6", "hmc", "J6", "J series"),
    ("makino-5-d200z", "5axis", "D200Z", "D series"), ("makino-5-d300", "5axis", "D300", "D series"),
    ("makino-5-da300", "5axis", "DA300", "DA series"), ("makino-5-d500", "5axis", "D500", "D series"), ("makino-5-v80s", "5axis", "V80S", "VS series"),
]
MAKINO_LABELS = {
    "spindle rpm": "max_rpm", "spindle taper": "spindle_taper", "rapid traverse": "rapid", "cutting feedrate": "feed",
    "maximum payload": "table_load", "atc capacity": "tools", "tool to tool": "tool_change", "chip to chip": "tool_change",
    "maximum workpiece": "workpiece", "maximum workpiece size": "workpiece", "a-axis": "a_axis", "b-axis": "b_axis", "c-axis": "c_axis",
    "maximum tool diameter": None, "maximum tool weight": None, "maximum tool length": None, "optional atc capacity:": None,
    "rib head available": None,
}


def makino(text):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    start = next((i for i, l in enumerate(lines) if re.match(r"^X: ", l)), None)
    if start is None:
        return None
    specs = {}
    head = lines[start - 1]
    if head.startswith("Table:"):
        specs["table_size"] = head.split(":", 1)[1].strip()
    elif lines[start - 2].startswith("Pallet"):
        specs["table_size"] = "Pallet " + head
    m = re.match(r"X: ([\d,]+ ?mm) Y: ([\d,]+ ?mm) Z: ([\d,]+ ?mm)", lines[start])
    if m:
        specs["x_travel"], specs["y_travel"], specs["z_travel"] = (v.replace(",", "") for v in m.groups())
    key, buf = None, []
    for l in lines[start + 1:]:
        low = l.lower()
        if low.startswith(("related content", "purchase a makino", "table:", "pallet:")) or re.match(r"^x: ", low):
            break
        if low in MAKINO_LABELS:
            if key and buf:
                specs[key] = " / ".join(buf)
            key, buf = MAKINO_LABELS[low], []
            continue
        if key:
            buf.append(l)
    if key and buf:
        specs[key] = " / ".join(buf)
    specs = {k: v for k, v in specs.items() if k and v and "request machine specs" not in v}
    if "max_rpm" in specs and not re.search(r"rpm", specs["max_rpm"], re.I):
        specs["max_rpm"] = specs["max_rpm"].replace("K", ",000") + " rpm" if re.fullmatch(r"[\d,]+", specs["max_rpm"]) else specs["max_rpm"]
    return specs


MAKERS = {
    "jyoti": {"name": "Jyoti CNC", "country": "India", "site": "https://jyoti.co.in"},
    "bfw": {"name": "BFW (Bharat Fritz Werner)", "country": "India", "site": "https://bfwindia.com"},
    "makino": {"name": "Makino", "country": "Japan", "site": "https://www.makino.com"},
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("++", " plus plus").replace("+", " plus")).strip("-")


def tidy(model):
    m = re.sub(r"\s+", " ", model).strip()
    m = re.sub(r"^BMV(\d)", r"BMV \1", m)
    m = re.sub(r"(\d)TC(\d)", r"\1 TC\2", m)
    m = re.sub(r"\+TC", "+ TC", m)
    return m


machines, seen = [], set()
for fname, mtype, maker, series, filt, prefix in SOURCES:
    txt = open(f"raw/{fname}.txt", encoding="utf-8").read()
    url = re.search(r"^URL: (.*)$", txt, re.M).group(1)
    variants, _ = parse(txt)
    for v, specs in variants.items():
        if filt and not re.search(filt, v):
            continue
        if len(specs) < 5:  # partial rows – not enough to compare
            continue
        model = tidy(prefix + v)
        s = slug(f"{maker} {model}")
        if s in seen:
            continue
        seen.add(s)
        machines.append({"slug": s, "maker": maker, "model": model, "series": series, "type": mtype, "source": url, "specs": specs})

for fname, mtype, model, series in MAKINO:
    try:
        txt = open(f"raw/{fname}.txt", encoding="utf-8").read()
    except OSError:
        continue
    specs = makino(txt)
    if not specs or len(specs) < 5:
        print("skip", fname, specs, file=sys.stderr)
        continue
    url = re.search(r"^URL: (.*)$", txt, re.M).group(1)
    machines.append({"slug": slug(f"makino {model}"), "maker": "makino", "model": model, "series": series, "type": mtype, "source": url, "specs": specs})

# DMG MORI: only the public "key data" (travels, workpiece size/weight, bar capacity) – the full sheet needs a login.
DMG = [
    ("dmg-cmx600v", "vmc", "CMX 600 V", "CMX V series"), ("dmg-cmx800v", "vmc", "CMX 800 V", "CMX V series"),
    ("dmg-cmx1100v", "vmc", "CMX 1100 V", "CMX V series"), ("dmg-nvx5060", "vmc", "NVX 5060 2nd Gen.", "NVX series"),
    ("dmg-nvx5080", "vmc", "NVX 5080 2nd Gen.", "NVX series"), ("dmg-nvx5100", "vmc", "NVX 5100 2nd Gen.", "NVX series"),
    ("dmg-dmu50", "5axis", "DMU 50 3rd Gen.", "DMU series"), ("dmg-dmu75", "5axis", "DMU 75 monoBLOCK 2nd Gen.", "monoBLOCK"),
    ("dmg-nhx5000", "hmc", "NHX 5000 4th Gen.", "NHX series"),
    ("dmg-t-clx-350", "turning", "CLX 350", "CLX series"), ("dmg-t-clx-450", "turning", "CLX 450", "CLX series"),
    ("dmg-t-nlx-2000", "turning", "NLX 2000", "NLX series"), ("dmg-t-nlx-2500-2nd", "turning", "NLX 2500 2nd Gen.", "NLX series"),
    ("dmg-t-nlx-3000", "turning", "NLX 3000", "NLX series"), ("dmg-t-ctx-450", "turning", "CTX 450", "CTX series"),
]
DMG_LABELS = {
    "max. x-axis stroke": "x_travel", "max. y-axis stroke": "y_travel", "max. z-axis stroke": "z_travel",
    "max. workpiece weight": "table_load", "max. workpiece diameter": "max_turn_dia", "max. workpiece length": "workpiece_len",
    "max. workpiece width": "workpiece_w", "max. workpiece height": "workpiece_h", "max. bar capacity diameter": "bar_capacity",
    "max. turning length": "max_turn_len", "max. swing diameter": "swing",
}


def dmg(text, mtype):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    specs = {}
    for i, l in enumerate(lines[:-1]):
        k = DMG_LABELS.get(l.lower())
        if k and k not in specs and re.match(r"^[\d,.]+ ?(mm|kg)", lines[i + 1]):
            specs[k] = lines[i + 1].replace(",", "")
    if mtype == "turning" and "workpiece_len" in specs:
        specs.setdefault("max_turn_len", specs["workpiece_len"])
    if mtype != "turning" and {"workpiece_len", "workpiece_w"} <= specs.keys():
        specs["workpiece"] = f"{specs['workpiece_len'].replace(' mm', '')} x {specs['workpiece_w'].replace(' mm', '')}" + (f" x {specs['workpiece_h']}" if "workpiece_h" in specs else " mm")
    if mtype != "turning" and "max_turn_dia" in specs:  # on milling machines this is the max. workpiece diameter
        specs.setdefault("workpiece", "Ø " + specs.pop("max_turn_dia"))
    for k in ("workpiece_len", "workpiece_w", "workpiece_h"):
        specs.pop(k, None)
    if mtype == "turning" and "max_turn_dia" not in specs:
        return None
    ctrl = [c for c in ("SIEMENS", "HEIDENHAIN", "MAPPS Fanuc", "CELOS", "FANUC") if c in lines]
    if ctrl:
        specs["controls"] = ", ".join(ctrl)
    return specs


MAKERS["dmgmori"] = {"name": "DMG MORI", "country": "Germany / Japan", "site": "https://en.dmgmori.com"}
for fname, mtype, model, series in DMG:
    try:
        txt = open(f"raw/{fname}.txt", encoding="utf-8").read()
    except OSError:
        continue
    specs = dmg(txt, mtype)
    if not specs or len(specs) < 3:
        print("skip", fname, specs, file=sys.stderr)
        continue
    url = re.search(r"^URL: (.*)$", txt, re.M).group(1)
    machines.append({"slug": slug(f"dmg mori {model}"), "maker": "dmgmori", "model": model, "series": series, "type": mtype, "source": url, "specs": specs, "partial": True})

print(len(machines), "machines", file=sys.stderr)
out ="// Generated from the manufacturers' own published spec pages (see `source` on each machine).\n"
out += "// Values are as published, with the units the manufacturer used. Re-generate rather than hand-edit.\n"
out += "import type { CncMachine, CncMaker } from \"./cnc-machines\";\n\n"
out += "export const CNC_MAKERS: Record<string, CncMaker> = " + json.dumps(MAKERS, indent=2, ensure_ascii=False) + ";\n\n"
out += "export const CNC_DATA_CHECKED = \"" + subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip() + "\";\n\n"
out += "export const CNC_MACHINES: CncMachine[] = " + json.dumps(machines, indent=1, ensure_ascii=False) + ";\n"
open(sys.argv[1], "w", encoding="utf-8").write(out)
