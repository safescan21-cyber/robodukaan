// Written content for search engines and buyers (English): category buying guides and
// repair-service landing pages. Only states what the shop actually offers.

export type Faq = { q: string; a: string };

export const CATEGORY_GUIDES: Record<string, { intro: string; tips: string[]; faqs: Faq[] }> = {
  "industrial-control-boards": {
    intro: "Industrial control boards run the logic of machines and panels: PID temperature controllers, timer and relay boards, interface cards and inverter/UPS control cards. They are the first thing to check – and often the cheapest part to replace – when a machine stops responding.",
    tips: [
      "Match the supply voltage (24 V DC is most common in panels) and the relay or SSR output type.",
      "Check the mounting size, e.g. 48×48 mm or 72×72 mm panel cut-outs for controllers.",
      "For replacement cards, compare the connector layout and the controller IC with your old board.",
    ],
    faqs: [
      { q: "Can I replace only the control card instead of the whole machine panel?", a: "Usually yes. If the card's connectors and supply voltage match, a replacement card is the quickest fix. If you're not sure, send us photos for a free check or repair quote." },
      { q: "Do you repair control boards as well?", a: "Yes – we repair industrial control boards at component level. Upload photos on the PCB repair page for a free quote." },
    ],
  },
  "smps-power-supplies": {
    intro: "SMPS (switch-mode power supplies) convert mains AC into the stable DC voltages that PLCs, sensors, HMIs and control boards need. DIN-rail SMPS are standard in control panels; enclosed SMPS are used inside machines and LED systems; DC-DC converters step one DC voltage to another.",
    tips: [
      "Choose output voltage first (24 V for most panels, 12 V or 5 V for electronics), then current with 20–30% spare capacity.",
      "Add up the current of every load on the supply – PLC, sensors, relays, HMI – before picking the size.",
      "Look for short-circuit, overload and over-voltage protection, and a wide input range (85–264 V AC) for unstable mains.",
    ],
    faqs: [
      { q: "What size SMPS do I need for a control panel?", a: "Add the current of all 24 V loads, then choose an SMPS rated 20–30% higher. For example, loads drawing 3.8 A together need at least a 5 A (120 W) supply." },
      { q: "My SMPS output is dropping or the LED blinks – repair or replace?", a: "Swollen output capacitors are a common cause and are repairable. For low-cost units a replacement is often faster; for expensive or special supplies, send photos for a repair quote." },
    ],
  },
  "vfd-motor-drives": {
    intro: "VFD and motor-drive boards control motor speed and torque: gate driver boards for IGBT power stages, BLDC drivers, stepper drivers and DC motor speed controllers. When a drive trips with overcurrent or short-circuit faults, the gate driver or power stage is often where the fault is.",
    tips: [
      "Match the motor type (3-phase induction, BLDC, stepper or DC) and its voltage and current.",
      "For gate driver boards, check the IGBT module type and drive power (kW) they are made for.",
      "Stepper drivers: set the current to the motor's rated phase current and choose microstepping for smooth motion.",
    ],
    faqs: [
      { q: "My VFD shows an overcurrent (oc / OC / F0001) fault – what should I check?", a: "Run the drive with the motor disconnected. If the fault stays, the drive itself is faulty – often the IGBT or gate driver. See our VFD fault code guide, or send photos of the board for a repair quote." },
      { q: "Do you repair VFDs of all brands?", a: "We repair drive power and control boards at component level for the common brands used in Indian factories, including Delta, Yaskawa, Mitsubishi, Siemens, ABB, Schneider and Danfoss." },
    ],
  },
  "plc-io-modules": {
    intro: "PLC and I/O modules automate machines and processes: compact mini PLCs for small machines, digital input/output modules to add more signals, and isolated signal converters (4–20 mA ↔ 0–10 V) to connect sensors and instruments.",
    tips: [
      "Count your inputs and outputs and keep about 20% spare for later changes.",
      "Check input type (NPN / PNP, 24 V DC) and output type (relay for mixed loads, transistor for fast switching).",
      "Use isolated signal converters when sensors and the PLC have different grounds, to avoid noise and damage.",
    ],
    faqs: [
      { q: "Should I choose relay or transistor outputs?", a: "Relay outputs switch AC or DC loads and are robust; transistor outputs are faster and last longer for frequent switching such as stepper pulses or solenoid valves." },
      { q: "Can a faulty PLC be repaired?", a: "Often yes – power supply sections, I/O channels and communication ports are common repairs. Send photos of the PLC and the fault for a free quote." },
    ],
  },
  "load-cells-weighing": {
    intro: "Load cells measure weight and force in platform scales, tank and hopper weighing, packing machines and test rigs. A complete weighing system has load cells, a junction box to combine them, and a weighing indicator or amplifier to display and output the weight.",
    tips: [
      "S-type load cells suit tension and hanging loads; single-point cells suit small platform scales; compression cells suit tanks and weighbridges.",
      "Choose a capacity 1.5–2× your maximum load to allow for shock loads.",
      "With several load cells, use a trimming junction box so each corner reads the same.",
    ],
    faqs: [
      { q: "My weighing indicator shows unstable or wrong readings – what's wrong?", a: "Common causes are moisture in the load cell cable or junction box, a damaged load cell, or a faulty indicator input. Check the cable and junction box first; we also repair weighing indicators." },
      { q: "What capacity load cell should I buy?", a: "Take the maximum weight per load cell (total weight ÷ number of cells) and choose about 1.5–2× that capacity." },
    ],
  },
  "industrial-sensors": {
    intro: "Industrial sensors give machines their inputs: inductive proximity sensors detect metal, photoelectric sensors detect objects and labels, and RTD or thermocouple sensors measure temperature for controllers and PLCs.",
    tips: [
      "Proximity sensors: choose the thread size (M8, M12, M18, M30), sensing distance and NPN or PNP output to match your PLC input.",
      "Photoelectric sensors: diffuse type for short ranges, retro-reflective or through-beam for longer distances.",
      "Temperature: PT100 for accurate readings up to about 400 °C, thermocouples (K-type) for higher temperatures.",
    ],
    faqs: [
      { q: "NPN or PNP – which sensor do I need?", a: "It depends on your PLC input: sinking inputs need PNP sensors, sourcing inputs need NPN. Check the PLC manual or ask us with the PLC model." },
      { q: "Can I search by my old sensor's part number?", a: "Yes – use the replacement part finder and type the part number from the old sensor's label." },
    ],
  },
  "relays-power-components": {
    intro: "Relays and power components switch and control power in machines and drives: solid state relays (SSR) for heaters, IGBT modules and MOSFETs for inverters and drives, and high-voltage capacitors for DC bus and filter circuits.",
    tips: [
      "SSRs: choose 2–3× the load current and mount them on a heatsink; use zero-cross SSRs for resistive heaters.",
      "IGBT modules: match voltage, current and the module package exactly when replacing.",
      "Capacitors: match capacitance and voltage, and prefer 105 °C rated types for power supplies and drives.",
    ],
    faqs: [
      { q: "Why does my SSR fail quickly?", a: "Usually it runs too hot – the current rating is too close to the load, or there is no proper heatsink. Choose a higher rating and add a heatsink." },
      { q: "Are your IGBT modules and MOSFETs genuine?", a: "Power semiconductors are often counterfeited in the grey market. Our parts are tested; if you need a specific make, ask us before ordering." },
    ],
  },
  "displays-hmi": {
    intro: "Displays and HMIs are the operator's view of the machine: touch-screen HMIs that talk to PLCs over RS232/RS485 or Modbus, panel meters for voltage and current, and LCD modules for embedded equipment.",
    tips: [
      "Check the communication port and protocol your PLC uses (RS232, RS485, Modbus RTU).",
      "Choose screen size by how much the operator needs to see – 4.3\" for simple machines, 7\" or larger for more screens.",
      "Panel meters: match the measuring range and the panel cut-out size.",
    ],
    faqs: [
      { q: "My HMI touch screen doesn't respond or the display is blank – can it be repaired?", a: "Yes, touch panels, backlights and power sections are common HMI repairs. Send photos of the HMI and the fault for a free quote." },
    ],
  },
  "communication-modules": {
    intro: "Communication modules connect industrial devices: RS485 interface boards and USB-to-RS485 converters for Modbus networks, plus Ethernet and wireless modules to bring machine data to computers and the cloud.",
    tips: [
      "Use isolated RS485 modules in noisy factory environments to protect equipment.",
      "Terminate long RS485 lines with 120 Ω resistors at both ends.",
      "USB converters with FTDI chips are the most reliable with industrial software.",
    ],
    faqs: [
      { q: "My Modbus RS485 communication keeps failing – what should I check?", a: "Check A/B wiring polarity, use twisted-pair cable, add termination at both ends, and make sure every device has the same baud rate and settings." },
    ],
  },
  "test-repair-tools": {
    intro: "Test and repair tools for electronics maintenance: true-RMS multimeters, hot-air rework stations for SMD parts, temperature-controlled soldering stations and component testers to check transistors, capacitors (ESR) and inductors.",
    tips: [
      "Choose a true-RMS multimeter for measuring VFD and SMPS circuits correctly.",
      "Hot-air stations with adjustable airflow make SMD rework safer for nearby parts.",
      "An ESR tester finds dried-out capacitors – the most common fault in power supplies.",
    ],
    faqs: [
      { q: "Which tools do I need to start PCB repair?", a: "A true-RMS multimeter, a temperature-controlled soldering station, a component/ESR tester and, for SMD boards, a hot-air rework station." },
    ],
  },
};

export type RepairService = {
  slug: string;
  name: string;           // short name, e.g. "VFD repair"
  title: string;          // page title
  description: string;    // meta description (≤ 158 chars)
  intro: string;
  faults: string[];
  brands: string[];
  category?: string;      // shop category with replacement parts
  faultCodes?: string[];  // fault-code brand pages to link
  faqs: Faq[];
  // Typical repair price ranges (₹, + GST). The final price comes in the free quote after the photo check.
  prices?: { item: string; from: number; to?: number }[];
};

const PROCESS_FAQ: Faq = { q: "How does the repair work?", a: "Upload clear photos of the board and describe the fault. Our technician checks them and emails you a free quote, usually within 1–2 working days. Nothing is repaired without your approval. If you approve, courier the board to us – we repair it at component level, load-test it and ship it back." };

export const REPAIR_SERVICES: RepairService[] = [
  {
    slug: "vfd-drive-repair",
    name: "VFD / AC drive repair",
    title: "VFD repair in India – AC drive board repair",
    description: "Component-level VFD and AC drive repair: power boards, IGBT gate drivers, control cards. Delta, Yaskawa, Siemens, ABB and more. Free photo quote.",
    intro: "A stopped VFD stops the whole machine. We repair AC drives at component level – power boards, IGBT and gate driver stages, DC bus and pre-charge circuits, SMPS sections and control cards – and test them before they go back to you.",
    faults: ["Overcurrent or short-circuit trips (oc, OC, F0001, E.OC1)", "No display or drive won't power up", "DC bus overvoltage / undervoltage faults", "Ground fault and phase-loss errors", "Burnt IGBT, gate driver or pre-charge resistor", "Control card or keypad faults"],
    brands: ["Delta", "Yaskawa", "Mitsubishi", "Siemens", "ABB", "Schneider", "Danfoss", "INVT", "Fuji"],
    category: "vfd-motor-drives",
    faultCodes: ["delta", "yaskawa", "mitsubishi", "siemens", "abb", "schneider", "danfoss"],
    prices: [{ item: "Small VFD, up to 5.5 kW", from: 2000, to: 8000 }, { item: "VFD 7.5 – 22 kW", from: 8000, to: 25000 }, { item: "VFD 30 – 75 kW", from: 25000, to: 55000 }, { item: "Above 75 kW", from: 55000 }],
    faqs: [PROCESS_FAQ, { q: "Can a VFD with a burnt IGBT be repaired?", a: "In most cases yes – the IGBT module, gate driver and related parts are replaced and the drive is tested. We'll tell you in the quote if repair isn't worthwhile." }],
  },
  {
    slug: "smps-repair",
    name: "SMPS / power supply repair",
    title: "SMPS repair – industrial power supply repair",
    description: "Industrial SMPS and power supply repair at component level: no output, low voltage, blinking LED, burnt parts. DIN-rail and enclosed SMPS. Free photo quote.",
    intro: "Power supplies are the most common failure in control panels and machines. We repair DIN-rail, enclosed and open-frame SMPS, DC-DC converters and power sections of machines – replacing failed capacitors, MOSFETs, controllers and protection parts.",
    faults: ["No output or output keeps cycling (blinking LED)", "Low or unstable output voltage", "Blown fuse / burnt MOSFET or rectifier", "Swollen or leaking capacitors", "Fan or overheating faults"],
    brands: ["Mean Well", "Delta", "Omron", "Siemens SITOP", "Phoenix Contact", "Schneider", "machine-builder SMPS"],
    category: "smps-power-supplies",
    prices: [{ item: "DIN-rail / enclosed SMPS", from: 600, to: 1500 }, { item: "High-power or special SMPS", from: 1500, to: 5000 }],
    faqs: [PROCESS_FAQ, { q: "Is it worth repairing a cheap SMPS?", a: "For low-cost units a new SMPS is often faster – see our SMPS range. Repair makes sense for special, high-power or hard-to-find supplies." }],
  },
  {
    slug: "inverter-ups-repair",
    name: "Inverter & UPS card repair",
    title: "Inverter & UPS card repair in India",
    description: "Inverter and UPS control card repair: no backup, no charging, overload or beeping faults, burnt MOSFETs. Home and industrial units. Free photo quote.",
    intro: "We repair inverter and online/offline UPS control cards and power boards – charging circuits, MOSFET banks, driver and controller ICs – for home, shop and industrial units.",
    faults: ["No backup or no output on battery", "Battery not charging or overcharging", "Overload / short-circuit beeping", "Burnt MOSFETs or driver section", "Display or relay faults"],
    brands: ["Luminous", "Microtek", "V-Guard", "Su-Kam", "APC", "industrial UPS"],
    category: "industrial-control-boards",
    faqs: [PROCESS_FAQ],
  },
  {
    slug: "plc-repair",
    name: "PLC repair",
    title: "PLC repair in India – PLC & I/O module repair",
    description: "PLC and I/O module repair at component level: power section, inputs/outputs, communication ports. Siemens, Allen-Bradley, Mitsubishi, Delta. Free photo quote.",
    intro: "We repair PLC CPUs and I/O modules – internal power supplies, input and output channels, relay and transistor outputs, and communication ports – so you don't have to replace the whole unit or reprogram a new one.",
    faults: ["PLC doesn't power up or keeps resetting", "Dead inputs or outputs", "Relay output stuck or burnt", "Communication port (RS232/RS485) not working", "Battery / memory errors"],
    brands: ["Siemens", "Allen-Bradley", "Mitsubishi", "Omron", "Delta", "Schneider", "Fatek"],
    category: "plc-io-modules",
    prices: [{ item: "Compact PLC / I/O module", from: 1000, to: 5000 }, { item: "PLC CPU, large modular PLC", from: 5000 }],
    faqs: [PROCESS_FAQ, { q: "Will repairing the PLC erase my program?", a: "We don't intentionally clear programs, but memory can be lost when batteries or power sections fail. Always keep a backup of your PLC program before sending the unit." }],
  },
  {
    slug: "machine-control-board-repair",
    name: "Machine control board repair",
    title: "Machine control board repair – CNC & moulding",
    description: "Repair of machine control boards for CNC, injection moulding, packing, textile and food machines. Component-level repair and testing. Free photo quote.",
    intro: "Imported and Indian machines often use custom control boards that are expensive or no longer available. We repair them at component level – power sections, I/O, drivers and controllers – for CNC, injection moulding, packing, textile, printing and food-processing machines.",
    faults: ["Board doesn't power up", "Inputs or outputs not working", "Display or keypad faults", "Burnt tracks, connectors or components", "Intermittent faults when warm"],
    brands: ["CNC controllers", "injection moulding machines", "packing machines", "textile machines", "printing machines"],
    category: "industrial-control-boards",
    prices: [{ item: "CNC / machine control card", from: 2500, to: 5500 }, { item: "Large or multi-layer machine board", from: 5500 }],
    faqs: [PROCESS_FAQ, { q: "Can you repair a board without a circuit diagram?", a: "Often yes – most faults can be traced at component level without a diagram. Clear photos of both sides of the board help us quote accurately." }],
  },
  {
    slug: "weighing-indicator-repair",
    name: "Weighing indicator repair",
    title: "Weighing indicator & load cell amplifier repair",
    description: "Repair of weighing indicators, load cell amplifiers and weighbridge electronics: unstable readings, no display, ADC faults. Free photo quote.",
    intro: "We repair weighing indicators and load cell amplifiers used in platform scales, weighbridges, packing and batching machines – power supplies, ADC and input sections, displays and output cards.",
    faults: ["Unstable or drifting weight", "No display or blank segments", "Overload / ADC error messages", "RS232 or 4–20 mA output not working", "Calibration not holding"],
    brands: ["Avery", "Essae", "Mettler Toledo", "XK3190 / Yaohua", "weighbridge indicators"],
    category: "load-cells-weighing",
    faqs: [PROCESS_FAQ, { q: "Is the fault in the indicator or the load cell?", a: "Check the load cell cable and junction box for moisture first. If the indicator shows errors with no load cell connected, the indicator is likely faulty." }],
  },
  {
    slug: "servo-drive-repair",
    name: "Servo drive repair",
    title: "Servo drive repair – AC servo amplifier repair",
    description: "AC servo drive and amplifier repair: overcurrent, encoder, power board and control faults. Delta, Mitsubishi, Yaskawa, Panasonic and more. Free photo quote.",
    intro: "We repair AC servo drives and amplifiers – power stages, gate drivers, encoder interfaces and control boards – for CNC machines, robots and automation lines.",
    faults: ["Overcurrent or power-stage alarms", "Encoder or feedback errors", "No display or drive won't start", "Regeneration / overvoltage alarms", "Burnt power components"],
    brands: ["Delta", "Mitsubishi", "Yaskawa", "Panasonic", "Siemens", "Fanuc"],
    category: "vfd-motor-drives",
    prices: [{ item: "AC servo drive / amplifier", from: 4500, to: 18000 }, { item: "CNC spindle / large servo amplifier", from: 18000 }],
    faqs: [PROCESS_FAQ],
  },
  {
    slug: "hmi-repair",
    name: "HMI & touch panel repair",
    title: "HMI repair – touch screen & operator panels",
    description: "HMI and touch panel repair: unresponsive touch, blank or dim display, power and communication faults. Delta, Siemens, Weintek and more. Free photo quote.",
    intro: "We repair HMI operator panels and touch screens – touch panels, backlights and display drivers, power sections and communication ports – so you can keep your existing screens and program.",
    faults: ["Touch not responding or wrong touch position", "Blank, dim or flickering display", "HMI doesn't power up", "No communication with the PLC", "Cracked touch glass"],
    brands: ["Delta", "Siemens", "Weintek", "Mitsubishi", "Schneider", "Kinco"],
    category: "displays-hmi",
    prices: [{ item: "HMI / touch panel up to 7 inch", from: 2000, to: 5000 }, { item: "Larger HMI or panel PC", from: 5000 }],
    faqs: [PROCESS_FAQ],
  },
];

export function getRepairService(slug: string) {
  return REPAIR_SERVICES.find((s) => s.slug === slug);
}
