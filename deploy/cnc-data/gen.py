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

MAKERS = {
    "jyoti": {"name": "Jyoti CNC", "country": "India", "site": "https://jyoti.co.in"},
    "bfw": {"name": "BFW (Bharat Fritz Werner)", "country": "India", "site": "https://bfwindia.com"},
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

print(len(machines), "machines", file=sys.stderr)
out = "// Generated from the manufacturers' own published spec pages (see `source` on each machine).\n"
out += "// Values are as published, with the units the manufacturer used. Re-generate rather than hand-edit.\n"
out += "import type { CncMachine, CncMaker } from \"./cnc-machines\";\n\n"
out += "export const CNC_MAKERS: Record<string, CncMaker> = " + json.dumps(MAKERS, indent=2, ensure_ascii=False) + ";\n\n"
out += "export const CNC_DATA_CHECKED = \"" + subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip() + "\";\n\n"
out += "export const CNC_MACHINES: CncMachine[] = " + json.dumps(machines, indent=1, ensure_ascii=False) + ";\n"
open(sys.argv[1], "w", encoding="utf-8").write(out)
