// "Learn PCB design" – free study material (English). Practical, tool-independent basics, written for
// technicians and students who repair or build industrial boards. Numbers are common rules of thumb;
// the lessons say where a standard (IPC-2221, IEC 62368-1) must be checked for a real product.

export type LessonSection = { h: string; p?: string[]; list?: string[]; table?: { head: string[]; rows: string[][] } };
export type PcbLesson = {
  slug: string;
  title: string;      // page title (≤ 48 characters)
  h1: string;
  description: string;
  level: "Beginner" | "Intermediate";
  minutes: number;
  intro: string;
  sections: LessonSection[];
  faqs: { q: string; a: string }[];
};

export const PCB_LESSONS: PcbLesson[] = [
  {
    slug: "pcb-basics",
    title: "PCB basics – what a printed circuit board is",
    h1: "PCB basics: parts of a printed circuit board",
    description: "Learn the parts of a PCB – substrate (FR-4), copper, solder mask, silkscreen, pads, vias, through-hole and SMD – explained simply for beginners.",
    level: "Beginner", minutes: 8,
    intro: "A printed circuit board (PCB) holds electronic parts and connects them with copper tracks instead of wires. Knowing its parts makes both design and repair much easier.",
    sections: [
      { h: "The layers of a board", list: [
        "Substrate – the board itself, usually FR-4 (glass fibre + epoxy), 1.6 mm thick is the most common",
        "Copper – thin copper foil etched into tracks (traces), pads and planes; 1 oz/ft² (≈35 µm) is standard",
        "Solder mask – the green (or blue, black, red) coating that stops solder from bridging between tracks",
        "Silkscreen – the white printing: part names (R1, C5, U2), polarity marks and logos",
      ] },
      { h: "Important words", list: [
        "Pad – the copper area where a component pin is soldered",
        "Trace / track – a copper line carrying a signal or power",
        "Via – a small plated hole that connects copper on different layers",
        "Through-hole (THT) – parts with leads that go through holes (connectors, big capacitors, relays)",
        "SMD / SMT – surface-mount parts soldered on the surface (0603 resistors, SOIC and QFN chips)",
        "Plane / pour – a large copper area, usually ground (GND) or a supply voltage",
      ] },
      { h: "Single, double and multilayer boards", p: [
        "Single-sided boards (copper on one side) are cheap and still common in power supplies and appliances. Double-sided boards have copper on both sides joined by vias. Multilayer boards (4, 6, 8+ layers) have copper layers inside, used for processors, fast signals and dense control boards.",
        "When repairing, a broken inner-layer track on a multilayer board cannot be seen – that is why careful continuity testing matters.",
      ] },
    ],
    faqs: [
      { q: "What is FR-4?", a: "FR-4 is the most common PCB base material: woven glass fibre with flame-retardant epoxy resin." },
      { q: "What does 1 oz copper mean?", a: "1 ounce of copper spread over one square foot, about 35 µm thick. Power boards often use 2 oz (70 µm)." },
    ],
  },
  {
    slug: "design-workflow",
    title: "PCB design process step by step",
    h1: "The PCB design process – from idea to board",
    description: "The PCB design workflow step by step: schematic, footprints, placement, routing, design rule check (DRC), Gerber files, BOM and assembly.",
    level: "Beginner", minutes: 7,
    intro: "Every PCB design tool follows the same basic steps. Learn the order once and you can use KiCad, EasyEDA, Altium or any other tool.",
    sections: [
      { h: "The steps", list: [
        "1. Requirements – voltages, currents, size, connectors, environment (heat, dust, vibration)",
        "2. Schematic – draw the circuit with symbols and connect them with nets",
        "3. Footprints – give every symbol the correct physical pad pattern",
        "4. Board outline and stack-up – size, mounting holes, number of layers, copper thickness",
        "5. Placement – put parts on the board (the most important step for a good layout)",
        "6. Routing – draw tracks, planes and vias",
        "7. Checks – ERC on the schematic, DRC on the layout, and a careful visual review",
        "8. Output – Gerber and drill files, BOM and pick-and-place file for the factory",
        "9. Prototype, test, fix and update the design",
      ] },
      { h: "Tip", p: ["Most mistakes are found in step 7 – print the layout at 1:1 scale on paper and place the real parts on it to check footprints and connectors before you order boards."] },
    ],
    faqs: [
      { q: "What is DRC?", a: "Design Rule Check – the tool checks your layout for clearance, track width, hole size and unconnected nets against the rules you set." },
      { q: "What is ERC?", a: "Electrical Rule Check – the schematic is checked for unconnected pins, outputs shorted together and missing power connections." },
    ],
  },
  {
    slug: "schematic-and-footprints",
    title: "Schematic design & footprints for PCBs",
    h1: "Schematic design and choosing footprints",
    description: "How to draw a clean PCB schematic, use nets and labels, add decoupling capacitors and pick the right footprints (0603, SOIC, QFN, TO-220).",
    level: "Beginner", minutes: 8,
    intro: "A clean schematic is the base of a good board – and the first thing a repair technician looks for. Wrong footprints are the most common reason a first board fails.",
    sections: [
      { h: "Good schematic habits", list: [
        "Inputs on the left, outputs on the right, power at the top, ground at the bottom",
        "Use net labels instead of long crossing wires",
        "Put a 100 nF decoupling capacitor next to every IC supply pin, plus a bulk capacitor (e.g. 10 µF) per supply",
        "Write values, voltage ratings and power ratings on parts (e.g. 10k 0.25 W, 470 µF 35 V)",
        "Split big designs into sheets: power, MCU, I/O, communication",
      ] },
      { h: "Common footprints", table: { head: ["Package", "Used for", "Note"], rows: [
        ["0805 / 0603", "Resistors, capacitors", "0805 is easiest to hand-solder"],
        ["SOT-23", "Small transistors, regulators", "Check the pin order in the datasheet"],
        ["SOIC-8 / SOIC-16", "Op-amps, drivers, EEPROMs", "1.27 mm pitch"],
        ["TSSOP / QFP", "MCUs, logic", "0.5–0.65 mm pitch, needs good soldering"],
        ["QFN", "MCUs, power ICs", "Exposed pad must be soldered (heat)"],
        ["TO-220 / TO-247", "MOSFETs, IGBTs, regulators", "Leave space for the heatsink"],
      ] } },
      { h: "Check every footprint", p: ["Compare each footprint with the 'recommended land pattern' drawing in the part's datasheet. Pin 1 position, pin order of transistors and regulators, and polarity of diodes and electrolytic capacitors cause most errors."] },
    ],
    faqs: [
      { q: "Why is a decoupling capacitor needed?", a: "It supplies the quick current pulses an IC draws and stops noise on the supply line. Place it as close to the supply pin as possible." },
    ],
  },
  {
    slug: "component-placement",
    title: "PCB component placement rules",
    h1: "Component placement – the most important layout step",
    description: "PCB component placement rules: connectors, power section, high-voltage separation, decoupling capacitors, heat, and placement for easy assembly and repair.",
    level: "Intermediate", minutes: 7,
    intro: "Good placement makes routing easy and the board reliable. Bad placement cannot be fixed with clever routing.",
    sections: [
      { h: "Placement order", list: [
        "1. Fixed parts first: connectors, mounting holes, switches, displays, heatsinks",
        "2. Power section: input, fuse, rectifier, regulators – kept together and near the input connector",
        "3. Main ICs (MCU, driver), then their support parts around them",
        "4. Decoupling capacitors right next to the IC pins they serve",
      ] },
      { h: "Rules that prevent failures", list: [
        "Keep high-voltage (mains, DC bus) and low-voltage (control) areas separate, with a clear gap or slot",
        "Keep hot parts (resistors, MOSFETs, bridge rectifiers) away from electrolytic capacitors – heat shortens their life",
        "Keep crystals, analog inputs and sensor signals away from switching parts and relays",
        "Keep parts away from the board edge and from places where screws and brackets go",
        "Put test points on supply rails and key signals – it makes repair much faster",
        "Use one orientation for polarised parts where possible – fewer assembly mistakes",
      ] },
    ],
    faqs: [
      { q: "Why do electrolytic capacitors fail on VFD and SMPS boards?", a: "Mostly heat and ripple current. Each 10 °C rise roughly halves their life, so placing them away from hot parts matters." },
    ],
  },
  {
    slug: "trace-width-current",
    title: "PCB trace width for current (IPC-2221)",
    h1: "PCB trace width and current capacity",
    description: "How wide a PCB track must be for 1 A, 2 A, 3 A or 5 A – IPC-2221 based table for 1 oz copper, plus via current and tips for high-current boards.",
    level: "Intermediate", minutes: 6,
    intro: "A track that is too thin heats up, and in the worst case burns open like a fuse. The width needed depends on current, copper thickness and how much temperature rise you accept.",
    sections: [
      { h: "Quick table (outer layer, 1 oz / 35 µm copper, 10 °C rise)", p: ["Approximate values from the IPC-2221 formula. Inner layers need about 2.5× this width; 2 oz copper needs about half the width."], table: { head: ["Current", "Minimum width", "Practical width"], rows: [
        ["0.5 A", "≈ 0.15 mm", "0.25 mm"],
        ["1 A", "≈ 0.3 mm", "0.5 mm"],
        ["2 A", "≈ 0.8 mm", "1.0 mm"],
        ["3 A", "≈ 1.4 mm", "1.5–2 mm"],
        ["5 A", "≈ 2.8 mm", "3 mm or a copper pour"],
      ] } },
      { h: "High-current tips", list: [
        "Use copper pours instead of tracks for big currents",
        "Use several vias in parallel when current changes layer – one small via carries only about 1 A",
        "Choose 2 oz copper for power boards",
        "Keep the high-current loop short – it also reduces noise",
        "For power stages, add solder or a busbar on an exposed track only if the design really needs it",
      ] },
      { h: "Signal tracks", p: ["Signal tracks can be thin (0.15–0.25 mm). The limits there are the factory's minimum (often 0.1–0.15 mm) and, for fast signals, impedance."] },
    ],
    faqs: [
      { q: "What track width do I need for 1 amp?", a: "On an outer layer with 1 oz copper and 10 °C rise, about 0.3 mm minimum; 0.5 mm is a comfortable choice." },
      { q: "Why do inner layers need wider tracks?", a: "Inner layers cannot lose heat to the air, so they need more copper for the same temperature rise." },
    ],
  },
  {
    slug: "clearance-creepage-high-voltage",
    title: "PCB clearance & creepage for 230 V mains",
    h1: "Clearance and creepage for mains and high voltage",
    description: "Clearance vs creepage on PCBs, typical spacing for 230 V mains and DC bus, slots, conformal coating and safe isolation for SMPS and VFD boards.",
    level: "Intermediate", minutes: 7,
    intro: "On power supplies and drives, spacing between copper is a safety matter. Too little spacing leads to arcing, tracking (carbon paths) and shocks.",
    sections: [
      { h: "Two different distances", list: [
        "Clearance – the shortest distance through air between two conductors",
        "Creepage – the shortest distance along the board surface; dust and moisture make surface tracking possible",
      ] },
      { h: "Typical spacing (check the standard for your product)", p: ["For 230 V AC equipment the safety standard IEC 62368-1 (earlier IEC 60950 / 60335 for appliances) sets the exact values, depending on voltage, pollution degree and board material. As a rough guide used by designers:"], table: { head: ["Between", "Typical creepage"], rows: [
        ["Mains live and neutral (functional)", "≈ 2.5–3 mm"],
        ["Mains to safe low voltage (reinforced isolation)", "≈ 6–8 mm"],
        ["DC bus (≈ 540–800 V DC on 415 V drives) to control", "8 mm or more"],
      ] } },
      { h: "How to get more distance", list: [
        "Cut a slot (milled cut-out) in the board under optocouplers and transformers to increase creepage",
        "Keep solder mask, but don't rely on it as insulation",
        "Use optocouplers, transformers and isolated DC-DC converters rated for the isolation you need",
        "Conformal coating helps in dusty or humid factories",
      ] },
      { h: "Seen in repair", p: ["Black carbon tracks between high-voltage pads are a common cause of VFD and SMPS failure in dusty plants. When repairing, the carbon must be fully removed (cut out if needed) and the area cleaned and coated – just replacing parts is not enough."] },
    ],
    faqs: [
      { q: "What is the difference between clearance and creepage?", a: "Clearance is through the air; creepage is along the surface of the insulation. Creepage is usually the larger value." },
    ],
  },
  {
    slug: "grounding-emi",
    title: "PCB grounding & EMI – noise-free layout",
    h1: "Grounding, return paths and EMI",
    description: "PCB grounding explained: ground planes, return current paths, star ground, separating power and signal ground, and layout tips to reduce EMI and noise.",
    level: "Intermediate", minutes: 8,
    intro: "Most 'mystery' faults – random resets, wrong analog readings, communication errors – come from poor grounding. Current always flows back to its source, and that return path matters as much as the track.",
    sections: [
      { h: "Key rules", list: [
        "Use a solid ground plane where possible (on a 4-layer board, a full inner GND layer)",
        "Every signal's return current flows in the ground directly under it – don't cut slots in the ground under signals",
        "Keep high-current power ground and sensitive signal ground separate, joined at one point near the supply",
        "Keep switching loops (MOSFET, diode, capacitor) as small as possible – small loop, small antenna",
        "Route communication lines (RS485, CAN) as pairs, with termination and protection near the connector",
        "Filter signals where they enter the board: series resistor, capacitor, TVS diode",
      ] },
      { h: "Seen in repair", p: ["Boards that fail with communication errors or random resets in a factory often have a loose earth, a damaged shield connection or a dried-out filter capacitor – check those before replacing the processor."] },
    ],
    faqs: [
      { q: "What is a ground plane?", a: "A large continuous copper area connected to ground. It gives every signal a short return path and shields against noise." },
    ],
  },
  {
    slug: "smps-power-layout",
    title: "SMPS PCB layout guide (switching supply)",
    h1: "SMPS and power supply PCB layout",
    description: "Switch-mode power supply PCB layout: hot loops, input capacitor placement, MOSFET and transformer layout, snubbers, feedback routing and isolation.",
    level: "Intermediate", minutes: 8,
    intro: "A switching power supply that works on the bench can still be noisy, run hot or fail early if the layout is poor. The datasheet of the controller IC usually shows a recommended layout – follow it.",
    sections: [
      { h: "Layout rules", list: [
        "Find the 'hot loop' (input capacitor → MOSFET → transformer/inductor) and make it as small as possible",
        "Place the input capacitor right at the MOSFET and the controller's supply capacitor at its pin",
        "Keep the feedback network (resistor divider, optocoupler, TL431) away from the switching node and transformer",
        "Keep the switch node (drain) copper small – it is the main noise source",
        "Separate primary (mains side) and secondary (output side) with the required creepage, use a slot under the optocoupler",
        "Put snubber and clamp parts (RCD, TVS) close to the transformer",
        "Give the MOSFET and output diode enough copper or a heatsink",
      ] },
      { h: "Common SMPS failures in the field", list: [
        "Dried electrolytic capacitors (output ripple, startup problems)",
        "Shorted MOSFET with a blown fuse and failed current-sense resistor",
        "Failed startup resistor or controller IC",
        "Cracked solder joints on the transformer and heavy parts",
      ] },
    ],
    faqs: [
      { q: "Why does my SMPS make noise or get hot?", a: "Often a large hot loop, a bad snubber or a weak output capacitor. Check the layout against the controller datasheet and replace aged capacitors." },
    ],
  },
  {
    slug: "thermal-design",
    title: "PCB thermal design – heat & cooling",
    h1: "Thermal design: keeping boards cool",
    description: "PCB thermal design: copper area for heat, thermal vias, heatsinks, exposed pads, part spacing and why heat is the main cause of industrial board failure.",
    level: "Intermediate", minutes: 6,
    intro: "Heat is the main reason industrial boards fail. Capacitors dry out, solder joints crack and semiconductors age faster when they run hot.",
    sections: [
      { h: "Ways to remove heat", list: [
        "Copper area – a larger copper pour under a part spreads heat",
        "Thermal vias – an array of vias under an exposed pad carries heat to the other side",
        "Heatsinks – for TO-220/TO-247 parts and power modules, with thermal paste or pads",
        "Airflow – place tall parts so they don't block air from fans",
        "Spacing – keep hot parts apart and away from capacitors",
      ] },
      { h: "Thermal reliefs", p: ["Pads connected to large planes use 'thermal relief' spokes so they can be soldered. For high-current pads use wider spokes or a full connection, and accept that soldering needs more heat."] },
    ],
    faqs: [
      { q: "What are thermal vias?", a: "Small plated holes under a hot part that conduct heat from the top copper to other layers or the bottom side." },
    ],
  },
  {
    slug: "dfm-gerber-output",
    title: "DFM, Gerber files & ordering PCBs",
    h1: "Design for manufacturing, Gerber files and ordering boards",
    description: "Design for manufacturing (DFM) rules, Gerber and drill files, BOM and pick-and-place files, and how to order PCBs and assembly from a fabricator.",
    level: "Beginner", minutes: 6,
    intro: "A design is only useful if a factory can make it reliably and cheaply. DFM means following the fabricator's limits and giving them the right files.",
    sections: [
      { h: "Typical fabricator limits (check yours)", table: { head: ["Rule", "Common standard value"], rows: [
        ["Minimum track / space", "0.15 mm (6 mil) – 0.1 mm possible at extra cost"],
        ["Minimum drill", "0.3 mm"],
        ["Via annular ring", "≥ 0.15 mm"],
        ["Copper to board edge", "≥ 0.3–0.5 mm"],
        ["Board thickness", "1.6 mm standard"],
      ] } },
      { h: "Files to send", list: [
        "Gerber files – one per copper layer, solder mask, silkscreen, paste and board outline",
        "Drill file (Excellon) – hole positions and sizes",
        "BOM – part numbers, values, footprints and quantities",
        "Pick-and-place (centroid) file – for machine assembly",
        "Assembly drawing – polarity and special notes",
      ] },
      { h: "Before you order", list: [
        "Open the Gerbers in a Gerber viewer – check every layer, not just the design tool",
        "Add fiducials and tooling holes if the board will be machine assembled",
        "Panelise small boards to save cost",
      ] },
    ],
    faqs: [
      { q: "What is a Gerber file?", a: "The standard file format that describes each layer of a PCB (copper, mask, silkscreen) for the factory." },
    ],
  },
  {
    slug: "pcb-design-software",
    title: "PCB design software: KiCad, EasyEDA, Altium",
    h1: "PCB design software – which tool to learn",
    description: "Compare PCB design software for beginners and professionals: KiCad (free), EasyEDA (free, online), Altium Designer, Eagle/Fusion and OrCAD.",
    level: "Beginner", minutes: 5,
    intro: "The skills are the same in every tool. Pick one, learn it well, and the others become easy.",
    sections: [
      { h: "Popular tools", table: { head: ["Tool", "Cost", "Good for"], rows: [
        ["KiCad", "Free, open source", "Everything from hobby to professional multilayer boards"],
        ["EasyEDA", "Free, browser based", "Quick boards, direct ordering, large part library"],
        ["Altium Designer", "Paid", "Industry standard in many companies"],
        ["Autodesk Fusion (Eagle)", "Paid / limited free", "Small boards, mechanical integration"],
        ["Cadence OrCAD / Allegro", "Paid", "Large, high-speed professional designs"],
      ] } },
      { h: "Recommendation", p: ["Start with KiCad – it is free, works offline, and is used by professionals. Learn: schematic, footprints, placement, routing, DRC and Gerber output on one small real project such as a 24 V to 5 V power board with a relay output."] },
    ],
    faqs: [
      { q: "Is KiCad good enough for professional work?", a: "Yes. KiCad handles multilayer boards, differential pairs and full manufacturing output, and many companies use it." },
    ],
  },
  {
    slug: "common-pcb-design-mistakes",
    title: "Common PCB design mistakes & how to avoid",
    h1: "Common PCB design mistakes (and what repair teaches us)",
    description: "The most common PCB design mistakes – wrong footprints, thin power tracks, missing decoupling, poor creepage, hot capacitors – and how to avoid them.",
    level: "Beginner", minutes: 6,
    intro: "Repairing hundreds of industrial boards shows the same design weaknesses again and again. Avoid these and your boards will last.",
    sections: [
      { h: "Mistakes to avoid", list: [
        "Wrong footprint or pin order (transistors, regulators, connectors)",
        "Power tracks too thin – they overheat or burn open",
        "Missing or distant decoupling capacitors – random resets",
        "Not enough creepage on the mains side – arcing and carbon tracking",
        "Electrolytic capacitors next to heatsinks or power resistors – early failure",
        "No fuse or input protection (MOV, TVS)",
        "No test points and no silkscreen labels – hard to repair",
        "Heavy parts (transformers, relays) without support – cracked joints from vibration",
        "Ground plane cut by slots under signals – noise problems",
      ] },
      { h: "Design for repair", p: ["Label every test point and part, use standard footprints, avoid potting where possible, and keep a schematic. A board that can be repaired saves the machine owner days of downtime."] },
    ],
    faqs: [
      { q: "What is the most common reason a new PCB doesn't work?", a: "Footprint and pin-order errors, followed by missing connections the DRC did not catch because the schematic itself was wrong." },
    ],
  },
];

export function getPcbLesson(slug: string) {
  return PCB_LESSONS.find((l) => l.slug === slug);
}
