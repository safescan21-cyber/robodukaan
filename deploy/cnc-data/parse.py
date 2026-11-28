"""Parse manufacturer spec tables (tab-separated text from the page) into variants -> {standard key: value}.

python3 -I parse.py raw/<file>.txt   -> prints JSON {variant: {key: value}} plus unmatched labels
"""
import json
import re
import sys

# standard key -> regex on the row label (first match wins, order matters)
KEYS = [
    ("rapid", r"rapid"),
    ("tool_change", r"(tool to tool|tool change time|chip to chip)"),
    ("tools", r"(no\.? of tools|number of tool|tool storage capacity|tool capacity|magazine capacity|no\.? of stations|turret stations|number of stations|tool stations|^turret$)"),
    ("positioning", r"(positioning|position accuracy)"),
    ("repeatability", r"repeatab"),
    ("weight", r"(machine weight|^weight|net weight|weight.*approx)"),
    ("max_rpm", r"(spindle speed|max\.? speed|spindle rpm|speed range)"),
    ("spindle_power", r"(spindle (motor )?power|spindle motor|main motor|spindle output|fanuc.*rating|siemens.*rating|mitsubishi.*rating)"),
    ("tool_shank", r"(tool shank|shank size|turning tool size|tool size)"),
    ("spindle_taper", r"(spindle taper|^spindle nose$|^taper|spindle nose\s*$)"),
    ("table_size", r"^table size|^table working surface|^table dimension|^table \(l"),
    ("table_load", r"(max\.?\s*load|load on table|table load|load capacity)"),
    ("swing", r"swing over"),
    ("max_turn_dia", r"(max\.?\s*turning dia|maximum turning (dia|ø)|max\.? turning ø|max\.? turning diameter)"),
    ("max_turn_len", r"(max\.?\s*turning length|maximum turning length)"),
    ("chuck", r"chuck size|chuck dia"),
    ("bar_capacity", r"bar (capacity|dia)|bar work"),
    ("x_travel", r"(x[\s-]*axis|longitudinal travel|x travel|travel\s*\(?x)"),
    ("y_travel", r"(y[\s-]*axis|cross travel|y travel|travel\s*\(?y)"),
    ("z_travel", r"(z[\s-]*axis|head\s*stock travel|z travel|vertical travel|travel\s*\(?z)"),
    ("guideways", r"guide\s*ways"),
    ("feed", r"(cutting feed|feed rate)"),
]
# rows that are options or installation details, never compared
SKIP = r"(opt\.\s*\d|opt\s*\(|\(optional\)|optional|daylight|column height|floor to|to table top|nose face|pull stud|max\.? tool (dia|length|weight)|t\s*-?\s*slot|pallet|apc|kva|connected load|floor space|machine height|^height|^length|^width|bore|tool dia|column front)"


def parse(text):
    variants, out, unmatched = [], {}, []
    for raw in text.split("\n"):
        cells = [c.replace("\u00a0", " ").strip() for c in raw.split("\t")]
        if len(cells) < 3:
            continue
        section = cells[0].lower().rstrip(":") in ("", "capacity", "table", "model", "models", "description", "specification", "specifications", "parameters", "parameter", "particulars", "features", "slides", "main spindle", "machine model")
        if cells[1].lower() in ("unit", "units") or (cells[1] == "" and section and any(cells[2:]) and not all(re.fullmatch(r"[\d.,\s/-]*", c) for c in cells[2:] if c)):
            names = [c for c in cells[2:] if c]
            if names:
                variants = names
                for v in variants:
                    out.setdefault(v, {})
            continue
        if not variants:
            continue
        label, unit, vals = cells[0], cells[1], cells[2:]
        if not label or not any(vals):
            continue
        key = None
        low = label.lower()
        if not re.search(SKIP, low) or re.search(r"std", low):
            for k, rx in KEYS:
                if re.search(rx, low):
                    key = k
                    break
        if key == "spindle_power" and not re.search(r"kw|hp", (unit + " " + " ".join(vals)).lower()):
            key = None
        if not key:
            unmatched.append(label)
            continue
        for v, val in zip(variants, vals):
            if not val or val in ("-", "–", "NA"):
                continue
            d = out.setdefault(v, {})
            if key in d:  # keep the first (standard) value
                continue
            prefix = ""
            if key == "spindle_power":
                m = re.search(r"(fanuc\s*/\s*mitsubishi|fanuc|siemens|mitsubishi)", low)
                prefix = (m.group(1).title() + " ") if m else ""
            d[key] = (prefix + val + (" " + unit if unit and unit.lower() not in ("nos.", "nos", "") else "")).strip()
    return out, sorted(set(unmatched))


if __name__ == "__main__":
    txt = open(sys.argv[1], encoding="utf-8").read()
    url = re.search(r"^URL: (.*)$", txt, re.M).group(1)
    res, um = parse(txt)
    print(json.dumps({"url": url, "variants": res}, indent=1, ensure_ascii=False))
    if "-v" in sys.argv:
        print("UNMATCHED:", um)
