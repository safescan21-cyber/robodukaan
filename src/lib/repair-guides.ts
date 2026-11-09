// Practical repair guides for customers (English). Each guide: symptoms → causes → safe checks → when to send
// the board for repair. Linked from /pcb-repair, the repair service pages, fault-code pages and the footer.
import type { Faq } from "./seo-content";

export type GuideStep = { title: string; text: string };
export type RepairGuide = {
  slug: string;
  title: string;            // page title / H1 (keep under ~52 characters)
  description: string;      // meta description (≤ 158 characters)
  summary: string;          // card text on the guide list
  board: string;            // what it is about, e.g. "SMPS"
  minutes: number;          // rough reading / checking time
  intro: string;
  symptoms: string[];
  causes: string[];
  tools?: string[];
  steps: GuideStep[];
  sendForRepair: string[];  // signs the board needs a workshop
  faqs: Faq[];
  service?: string;         // REPAIR_SERVICES slug
  category?: string;        // shop category slug with replacement parts
  faultCodes?: string;      // /fault-codes/<brand> or "" for the index
};

const SAFETY_DC_BUS = "Switch off and isolate the supply, then wait at least 10 minutes and measure the DC bus (P/+ and N/–) with a multimeter on the DC 1000 V range before touching anything. Drive and SMPS capacitors can hold a lethal charge long after the display goes off.";

export const SAFETY_NOTE =
  "Safety first: these checks are for trained electricians and maintenance engineers. Work only on isolated equipment, use a meter rated CAT III, and never open a powered unit. If in doubt, send photos to us instead.";

export const REPAIR_GUIDES: RepairGuide[] = [
  {
    slug: "smps-not-working",
    title: "SMPS not working – causes and checks",
    description: "SMPS power supply dead, no output or LED blinking? Common causes (fuse, capacitors, MOSFET, controller) and safe step-by-step checks before repair.",
    summary: "Dead power supply, no output or a blinking LED – what usually fails and how to check it safely.",
    board: "SMPS / power supply",
    minutes: 6,
    intro: "A switch-mode power supply (SMPS) is the most common reason a control panel or machine suddenly goes dead. Most faults come from a few parts that wear out with heat and voltage spikes, so a structured check usually finds the problem quickly.",
    symptoms: ["No output voltage, power LED off", "Output LED blinking or the output keeps switching on and off (hiccup)", "Output voltage too low or unstable", "Fuse blows again as soon as power is applied", "Ticking or squealing sound, burnt smell"],
    causes: ["Dried-out or swollen output electrolytic capacitors (most common)", "Blown input fuse caused by a shorted bridge rectifier or switching MOSFET", "Failed start-up resistor or PWM controller IC (e.g. UC384x, OB2263 types)", "Overload or short circuit on the 24 V line (a faulty sensor or solenoid)", "Failed optocoupler or TL431 in the feedback loop (wrong or unstable voltage)"],
    tools: ["True-RMS multimeter", "Insulated screwdriver", "Torch / magnifier"],
    steps: [
      { title: "Check the load first", text: "Disconnect all output wires and measure the output with no load. If the voltage is now correct, the SMPS is fine and something on the 24 V line (sensor, valve, PLC input card) is pulling it down." },
      { title: "Check the mains input", text: "Measure the AC input at the SMPS terminals (L–N). Many 'dead SMPS' cases are a tripped MCB, loose terminal or blown panel fuse." },
      { title: "Look for visible damage", text: "With the unit isolated and discharged, open the cover and look for swollen or leaking capacitors, burnt resistors, cracked solder joints and a blackened fuse." },
      { title: "Test the input fuse", text: "Measure the fuse for continuity. If it is blown, do not just replace it – a blown fuse usually means the bridge rectifier or the switching MOSFET has shorted. Check those first (diode test), otherwise the new fuse will blow too." },
      { title: "Blinking LED / hiccup", text: "If the output turns on and off, the supply is protecting itself: either the load is too high, or the output capacitors have lost capacity. Bulged capacitor tops are a sure sign." },
      { title: "Decide: repair or replace", text: "For a low-cost DIN-rail SMPS, a new unit is often quickest. For high-power, special-voltage or machine-builder SMPS that are hard to buy, a component-level repair is usually far cheaper." },
    ],
    sendForRepair: ["Shorted MOSFET, rectifier or controller IC", "Burnt PCB tracks or repeated fuse failure", "Special or obsolete SMPS that can't be bought new", "You don't have an isolation transformer or safe test setup"],
    faqs: [
      { q: "Can I just replace the fuse in my SMPS?", a: "Only if you have found and fixed why it blew. A fuse almost never fails on its own – a shorted rectifier, MOSFET or capacitor usually caused it." },
      { q: "Why does my 24 V SMPS show only 18–20 V?", a: "Most often the output capacitors have dried out or the load is more than the SMPS rating. Test it without load: if it is still low, the capacitors or feedback parts need replacing." },
    ],
    service: "smps-repair",
    category: "smps-power-supplies",
  },
  {
    slug: "vfd-overcurrent-fault",
    title: "VFD overcurrent (OC) fault – causes and fixes",
    description: "VFD tripping with OC, overcurrent or short-circuit faults? Find out if the motor, cable or drive is faulty, with safe checks and when the drive needs repair.",
    summary: "Drive trips with OC / overcurrent at start or while running – motor, cable or drive?",
    board: "VFD / AC drive",
    minutes: 7,
    intro: "Overcurrent faults (oc, OC, OC1, F0001, E.OC1, OCF and similar) mean the drive measured more current than it allows. The cause can be the load, the motor or cable – or the drive's own power stage. A few checks tell you which.",
    symptoms: ["Trips immediately at start, even at low speed", "Trips during acceleration or when the load increases", "Trips with the motor disconnected", "Ground fault / short-circuit faults together with OC"],
    causes: ["Acceleration time too short or a jammed / overloaded machine", "Motor winding fault or damaged motor cable (often moisture or a crushed cable)", "Wrong motor data or wrong V/f settings", "Failed IGBT module, gate driver or current sensor inside the drive", "Loose connections on the motor terminals"],
    tools: ["Multimeter with diode test", "Insulation tester (megger) 500 V", "Drive manual for the fault code"],
    steps: [
      { title: "Note the exact fault code and when it happens", text: "At start, during acceleration, at constant speed or when stopping – this points to the cause. Look up the code in our fault-code guide for your drive brand." },
      { title: "Check settings and the machine", text: "Increase the acceleration time, check the motor rating data in the parameters, and make sure the machine turns freely by hand." },
      { title: "Test with the motor disconnected", text: "Isolate the supply, wait for the DC bus to discharge, disconnect U/V/W and run the drive without the motor. If it still trips with OC, the drive's power stage or current sensing is faulty." },
      { title: "Megger the motor and cable", text: "With the drive disconnected, test motor windings and cable to earth at 500 V. Low insulation (below about 1 MΩ) means the motor or cable is the problem – never megger with the drive connected." },
      { title: "Check the IGBTs (drive isolated)", text: `${SAFETY_DC_BUS} Then use the diode test from P/+ and N/– to U, V and W. A short or very low reading in any direction means a failed IGBT module.` },
    ],
    sendForRepair: ["OC trip with the motor disconnected", "Shorted IGBT readings or a burnt smell from the drive", "Fault returns immediately after reset at zero speed", "Current sensor or gate driver faults suspected"],
    faqs: [
      { q: "Can a VFD with a burnt IGBT be repaired?", a: "Usually yes. The IGBT module, gate driver parts and related components are replaced and the drive is load-tested. It is typically much cheaper than a new drive above a few kW." },
      { q: "Is the overcurrent fault always the drive's fault?", a: "No – very often it is the motor, cable or settings. Testing with the motor disconnected is the quickest way to tell." },
    ],
    service: "vfd-drive-repair",
    category: "vfd-motor-drives",
    faultCodes: "",
  },
  {
    slug: "how-to-test-igbt-module",
    title: "How to test an IGBT module with a multimeter",
    description: "Step-by-step: test an IGBT module or discrete IGBT with a digital multimeter's diode test – find shorts, open devices and failed freewheel diodes safely.",
    summary: "Find a shorted or open IGBT with a normal multimeter – step by step.",
    board: "IGBT / power stage",
    minutes: 5,
    intro: "IGBTs are the power switches in VFDs, servo drives, UPS and induction heaters. When they fail they usually short, which trips the drive or blows the input fuses. A digital multimeter's diode test is enough for a first check.",
    symptoms: ["Drive trips with OC / short circuit immediately", "Input fuses or rectifier blown", "Burn marks on the IGBT module or gate driver"],
    causes: ["Overcurrent or short circuit on the motor side", "Overheating (blocked fan, dirty heatsink, dried thermal paste)", "Gate driver failure", "Voltage spikes from long motor cables"],
    tools: ["Digital multimeter with diode test", "Insulated screwdriver to discharge the gate (optional: 10 kΩ resistor)"],
    steps: [
      { title: "Isolate and discharge", text: SAFETY_DC_BUS },
      { title: "Short the gate to emitter", text: "Briefly short gate and emitter of the IGBT (or keep the gate driver connected) so the IGBT is not partly switched on by a stored gate charge, which would give false readings." },
      { title: "Test the freewheel diode", text: "Red probe on emitter, black on collector: you should read a diode drop of about 0.3–0.7 V. Reversed probes (red on collector): the meter should show open (OL)." },
      { title: "Test collector–emitter for shorts", text: "A reading close to 0 V or a beep in both directions means the IGBT is shorted. In a 3-phase module, test each of the six switches (P to U/V/W and U/V/W to N)." },
      { title: "Know the limits of a meter test", text: "A multimeter only finds shorted switches and open diodes. Its test voltage is usually too low to switch an IGBT on (gate threshold is about 5–6 V), so an IGBT can pass the meter test and still fail under load. A proper check uses an IGBT tester or a gate-drive and load test." },
    ],
    sendForRepair: ["Any shorted IGBT – the gate driver and gate resistors usually need replacing too", "Modules on large drives that need correct mounting torque and thermal paste", "No test equipment to check the drive under load after the repair"],
    faqs: [
      { q: "If I replace only the shorted IGBT, will the drive work?", a: "Often not for long. A shorted IGBT usually damages its gate resistor and gate driver too, and the root cause (motor fault, fan, settings) must be fixed. A proper repair checks the whole power stage." },
      { q: "Can I use a different brand of IGBT?", a: "Yes, if voltage, current, switching speed, package and pin-out match. A Chinese equivalent with the same ratings is common in repairs." },
    ],
    service: "vfd-drive-repair",
    category: "relays-power-components",
  },
  {
    slug: "vfd-capacitor-failure",
    title: "VFD DC bus capacitors – signs of failure",
    description: "How to tell if your VFD's DC bus capacitors are failing: undervoltage and overvoltage trips, ripple, bulging. Checks, life and when to replace them.",
    summary: "Undervoltage trips, noise and bulging caps – how to tell if the DC bus capacitors are worn out.",
    board: "VFD / AC drive",
    minutes: 5,
    intro: "The large electrolytic capacitors on a drive's DC bus age with heat and running hours. Worn capacitors cause random trips, overheating and finally damage to the rectifier and IGBTs, so replacing them in time protects the whole drive.",
    symptoms: ["DC bus undervoltage (Lv, Uv) or overvoltage (ov) trips under load", "Drive does not power up or the display flickers", "Bulging tops, leaking electrolyte or a vented safety valve", "Motor speed hunting or high current ripple"],
    causes: ["Age: typical life is 5–10 years, shorter in hot panels", "High panel temperature or a failed cooling fan", "Drive stored unpowered for a long time (capacitors need reforming)", "Frequent mains spikes or unbalanced supply"],
    tools: ["Multimeter (DC voltage)", "ESR / capacitance meter for a workshop check"],
    steps: [
      { title: "Look at the capacitors", text: `${SAFETY_DC_BUS} Then check the capacitor tops and sleeves for bulging, cracks or electrolyte.` },
      { title: "Check the cooling", text: "A dead fan or blocked heatsink makes the capacitors age much faster. Clean filters and replace failed fans." },
      { title: "Measure the DC bus while running", text: "On a running drive (from the keypad monitor if available), the DC bus should be steady at about 1.35 × the mains voltage (around 540 V for 400 V supply). Large dips under load point to weak capacitors or a rectifier problem." },
      { title: "Drives stored for over a year", text: "Before running a drive that was stored unpowered for a long time, its capacitors usually need reforming (slowly raised voltage). Check the manual – switching it straight on can damage it." },
    ],
    sendForRepair: ["Visible bulging or leaking capacitors", "Undervoltage trips at normal mains voltage", "Drive older than about 7 years in a hot panel – preventive capacitor replacement"],
    faqs: [
      { q: "How long do VFD capacitors last?", a: "Typically 5–10 years. Every 10 °C rise in panel temperature roughly halves their life, so good ventilation matters." },
      { q: "Is capacitor replacement worth it?", a: "Yes – it is one of the cheapest repairs and prevents expensive damage to the rectifier and IGBTs later." },
    ],
    service: "vfd-drive-repair",
    category: "relays-power-components",
  },
  {
    slug: "plc-not-working",
    title: "PLC not working – power, I/O and comms checks",
    description: "PLC not powering up, outputs not switching or no communication? Step-by-step checks for power, inputs, outputs and ports before sending the PLC for repair.",
    summary: "PLC dead, outputs stuck or no communication – a structured checklist.",
    board: "PLC / I/O modules",
    minutes: 6,
    intro: "Most 'PLC faults' are actually power, wiring or field-device problems. A structured check saves time – and when the PLC itself is faulty, it is often a repairable power supply, I/O channel or port rather than the whole CPU.",
    symptoms: ["PLC power LED off or the PLC keeps restarting", "Inputs show no signal although the sensor works", "Output LED on but the relay/valve does not switch", "No communication with HMI, SCADA or the laptop", "Battery or memory error, program lost"],
    causes: ["Low or noisy 24 V supply (failing SMPS)", "Blown internal fuse or power section after a short on the I/O", "Burnt relay output contact or transistor output from an overloaded / inductive load", "Damaged RS-485/RS-232 port from a voltage spike or wrong wiring", "Dead backup battery"],
    tools: ["Multimeter", "Programming cable and software", "Spare 24 V supply for testing"],
    steps: [
      { title: "Check the power supply", text: "Measure the PLC supply at its terminals while running. 24 V DC PLCs need a steady 20.4–28.8 V; dips cause restarts. Try a known-good SMPS." },
      { title: "Check an input", text: "Measure the voltage at the input terminal while the sensor is active and compare with the common. Check NPN/PNP wiring – a mismatch is a common cause of 'dead' inputs." },
      { title: "Check an output", text: "If the output LED is on but the load does not work, measure the voltage at the output terminal. Relay outputs often fail with welded or burnt contacts; add suppression (RC or diode) to inductive loads." },
      { title: "Check communication", text: "Check cable, baud rate, station number and termination resistors on RS-485. Swap the cable before suspecting the port." },
      { title: "Back up the program", text: "Before any repair, upload and save the PLC program. Memory can be lost when batteries or power sections fail." },
    ],
    sendForRepair: ["PLC does not power up with a known-good 24 V supply", "Dead or stuck I/O channels", "Damaged communication port", "Burnt smell or visible damage on the PLC boards"],
    faqs: [
      { q: "Will repairing the PLC erase my program?", a: "We don't intentionally clear programs, but memory can be lost when the battery or power section fails. Always keep a backup before sending the unit." },
      { q: "Can one burnt output channel be repaired?", a: "Yes. Relay and transistor output channels are usually repairable at component level, so the whole PLC does not need replacing." },
    ],
    service: "plc-repair",
    category: "plc-io-modules",
  },
  {
    slug: "hmi-touch-not-working",
    title: "HMI touch screen not working – fixes",
    description: "HMI touch not responding, wrong touch position, blank or dim display? Calibration, power and communication checks, and when the touch panel needs repair.",
    summary: "Touch not responding, wrong position, blank or dim display – what to check.",
    board: "HMI / touch panel",
    minutes: 5,
    intro: "Operator panels work hard in dusty, hot and oily conditions. Touch, backlight and power faults are common and usually repairable – you can keep your existing HMI and program instead of buying and re-programming a new one.",
    symptoms: ["Touch does not respond or responds in the wrong place", "Display blank, very dim or flickering", "HMI does not power up or restarts", "'No communication' or PLC tags show ####"],
    causes: ["Worn or cracked resistive touch film (needs calibration or replacement)", "Failed backlight (LED strip or CCFL inverter) – picture visible only with a torch", "Failed internal power supply or 24 V input protection", "Communication cable, settings or port damage"],
    tools: ["Multimeter", "Torch", "HMI software / calibration menu"],
    steps: [
      { title: "Check the supply", text: "Measure the 24 V at the HMI terminals while it starts. Weak supplies cause restarts and dim screens." },
      { title: "Torch test for the backlight", text: "Shine a torch at an angle on a 'blank' screen. If you can see the picture faintly, the LCD works and only the backlight has failed – a common, repairable fault." },
      { title: "Calibrate the touch", text: "Most HMIs have a touch calibration in the system menu (often reached by holding a corner during start-up – see the manual). Calibration fixes many 'wrong position' problems." },
      { title: "Communication", text: "Check the cable, PLC station number, baud rate and protocol settings. Swap the cable before suspecting the port." },
    ],
    sendForRepair: ["Cracked glass or a touch film that no longer responds after calibration", "Backlight failure", "No power-up with a good 24 V supply", "Damaged communication port"],
    faqs: [
      { q: "Can only the touch screen be replaced?", a: "Yes – the touch panel (digitiser) can be replaced separately on most HMIs, keeping the display, board and your program." },
      { q: "My HMI picture is visible only with a torch. Is it repairable?", a: "Yes, that is a backlight fault. Replacing the LED backlight or inverter is a standard repair." },
    ],
    service: "hmi-repair",
    category: "displays-hmi",
  },
  {
    slug: "weighing-indicator-unstable",
    title: "Weighing indicator unstable or wrong reading",
    description: "Weight drifting, unstable or wrong on your weighing indicator or weighbridge? Check load cells, junction box and cables, and find out when the indicator needs repair.",
    summary: "Drifting, jumping or wrong weight – load cell, junction box or indicator?",
    board: "Weighing indicator / load cells",
    minutes: 6,
    intro: "Unstable weight is one of the most common problems on platform scales, weighbridges and packing machines. In most cases the cause is moisture or a damaged cable, not the indicator itself – a few measurements show where the fault is.",
    symptoms: ["Weight keeps drifting or jumping", "Zero does not hold, or wrong weight after calibration", "Over-load / ADC error on the display", "One corner of the platform weighs differently"],
    causes: ["Moisture in the junction box or load cell cable (most common, especially after rain)", "Damaged load cell (overload, shock or welding current through the cell)", "Loose or corroded wires in the junction box", "Mechanical problems: debris under the platform, binding or uneven supports", "Failed indicator input stage, ADC or power supply"],
    tools: ["Multimeter (mV range)", "Insulation tester (for cables, load cells disconnected from the indicator)"],
    steps: [
      { title: "Check the mechanics", text: "Clean under and around the platform, make sure nothing touches it and the supports are level. Mechanical binding causes many 'electronic' faults." },
      { title: "Open the junction box", text: "Look for water, corrosion or loose screws. Dry and clean it and use a fresh desiccant. Re-tighten the terminals." },
      { title: "Measure the excitation and signal", text: "At the junction box, check the excitation voltage from the indicator (often 5 or 10 V DC). Then measure each load cell's signal in mV with no load and with a test weight – a cell with a very different or unstable signal is faulty." },
      { title: "Test the indicator alone", text: "Connect the indicator to a single known-good load cell or a load cell simulator. If it is stable, the problem is in the cells or cables; if not, the indicator needs repair." },
      { title: "Recalibrate", text: "After fixing the cause, do a corner (shift) adjustment and recalibrate with certified test weights." },
    ],
    sendForRepair: ["Unstable reading with a known-good load cell connected", "ADC / input errors or a dead display", "RS-232 / 4–20 mA outputs not working", "Calibration not holding after power off"],
    faqs: [
      { q: "Is the fault in the load cell or the indicator?", a: "Test the indicator with one known-good load cell or a simulator. If the reading is stable, check the load cells and cables; if not, the indicator is faulty." },
      { q: "Why does my weighbridge drift after rain?", a: "Moisture in the junction box or cable is the usual cause. Dry and seal the junction box, and replace damaged cables." },
    ],
    service: "weighing-indicator-repair",
    category: "load-cells-weighing",
  },
  {
    slug: "inverter-ups-not-charging",
    title: "Inverter or UPS not charging the battery",
    description: "Inverter or UPS not charging, no backup or beeping on overload? Check battery, mains sensing and charging section safely, and know when the card needs repair.",
    summary: "No charging, no backup or constant beeping – battery or control card?",
    board: "Inverter / UPS card",
    minutes: 5,
    intro: "When an inverter or UPS stops charging or gives no backup, the battery is the first suspect – but mains sensing, charging MOSFETs and relays on the control card fail too. Simple voltage checks separate battery problems from card faults.",
    symptoms: ["Battery not charging, 'charging' LED off", "No backup or backup only for a few minutes", "Constant beeping, overload or short-circuit indication", "Unit works on mains but not on battery"],
    causes: ["Battery at the end of its life or low electrolyte (tubular batteries)", "Loose or corroded battery terminals", "Failed charging section (MOSFETs, relay, fuse) on the control card", "Mains sensing fault so the unit stays in battery mode", "Overload: more connected load than the inverter rating"],
    tools: ["Multimeter (DC voltage)", "Hydrometer for tubular batteries"],
    steps: [
      { title: "Check the battery", text: "Measure the battery voltage with the inverter off: a 12 V battery should read around 12.6–12.8 V when charged. Clean and tighten the terminals and check the electrolyte level." },
      { title: "Check charging voltage", text: "With mains on, measure at the battery terminals. In bulk charging it should rise to about 13.8–14.4 V per 12 V battery. No rise means the charging section is not working." },
      { title: "Check the load", text: "Switch off heavy loads (heaters, motors). Beeping on overload often goes away when the load is within the rating." },
      { title: "Fuses and relays", text: "With the unit switched off and disconnected from mains and battery, check the internal fuses. A blown battery fuse usually means a shorted MOSFET bank." },
    ],
    sendForRepair: ["No charging voltage with a healthy battery", "Burnt MOSFET bank or blown battery fuse", "Relay chattering or the unit stuck in battery mode", "Display or control card faults"],
    faqs: [
      { q: "How do I know if the battery or the inverter is the problem?", a: "Measure the charging voltage at the battery with mains on. If it rises to about 13.8–14.4 V, the inverter is charging and the battery is likely worn. If not, the charging section needs repair." },
      { q: "Can industrial UPS cards be repaired?", a: "Yes – control cards, power boards and charging sections of online and offline UPS are repaired at component level." },
    ],
    service: "inverter-ups-repair",
    category: "industrial-control-boards",
  },
  {
    slug: "servo-drive-encoder-error",
    title: "Servo drive encoder error – causes and checks",
    description: "Servo drive showing encoder or feedback errors? Check cables, connectors, shielding and the motor encoder, and find out when the servo amplifier needs repair.",
    summary: "Encoder / feedback alarms on servo drives – cable, motor or amplifier?",
    board: "Servo drive",
    minutes: 5,
    intro: "Encoder and feedback alarms stop CNC machines and automation lines immediately. Most are caused by the encoder cable or connector – the moving cable chain and oil take their toll – but the encoder interface in the amplifier can fail too.",
    symptoms: ["Encoder / feedback alarm at power-up or during movement", "Alarm only when the axis moves (cable chain movement)", "Wrong position or the axis runs away", "Alarm after a motor or cable replacement"],
    causes: ["Broken wires in the encoder cable (repeated bending in the cable chain)", "Oil or coolant in the connector, bent pins", "Poor shield or earth connection causing noise", "Failed motor encoder", "Damaged encoder interface or power supply in the servo amplifier"],
    tools: ["Multimeter (continuity)", "Spare encoder cable if available"],
    steps: [
      { title: "Read the exact alarm number", text: "Note the alarm and look it up in the drive manual – it often tells you whether the error is communication, battery (absolute encoders) or the encoder itself." },
      { title: "Inspect connectors", text: "Power off, then check both connectors for oil, corrosion and bent pins. Clean and reseat them." },
      { title: "Test the cable", text: "Check each wire for continuity while flexing the cable along its length – intermittent breaks show up only when moving. Check that the shield is earthed at the drive." },
      { title: "Swap to isolate the fault", text: "If the machine has identical axes, swap encoder cables or amplifiers between them (power off). If the alarm moves with the part, you have found the faulty one." },
      { title: "Absolute encoder battery", text: "For absolute-encoder systems, a low battery causes alarms and loss of position. Replace it with power on (if the manual allows) to keep the position data." },
    ],
    sendForRepair: ["Alarm stays with the amplifier after swapping", "Encoder supply voltage missing at the drive connector", "Burnt components or a dead amplifier display", "Power-stage alarms together with encoder errors"],
    faqs: [
      { q: "Can a servo amplifier with an encoder fault be repaired?", a: "Yes, the encoder interface, its power supply and the control board are repairable at component level for most common brands." },
      { q: "Why does the alarm come only when the axis moves?", a: "That usually means a broken wire inside the encoder cable that opens when the cable chain bends. Test continuity while moving the cable." },
    ],
    service: "servo-drive-repair",
    category: "vfd-motor-drives",
  },
  {
    slug: "send-board-for-repair",
    title: "How to send a PCB for repair – photos & packing",
    description: "Get a faster, more accurate repair quote: which photos to take, details to include, and how to pack and courier an industrial PCB or drive safely.",
    summary: "Which photos and details we need for a quick quote, and how to pack your board safely.",
    board: "All boards",
    minutes: 4,
    intro: "Good photos and a short fault description let us quote quickly and correctly. Safe packing makes sure the board arrives without new damage. Here is exactly what to send.",
    symptoms: ["You want a repair quote", "You are sending a board, drive, PLC or HMI by courier"],
    causes: ["Missing model numbers or fault details slow down quotes", "Loose packing causes cracked components and broken connectors in transit"],
    steps: [
      { title: "Photos to take", text: "Both sides of the board in good light, the label / rating plate with model and serial number, close-ups of any burnt or damaged area, and the fault code on the display if there is one." },
      { title: "Details to include", text: "Make and model, what the machine does, what happened when it failed (e.g. after a power cut, at start, during rain), the error code, and anything already tried or replaced." },
      { title: "Pack it safely", text: "Put the board in an anti-static bag (or clean plastic), wrap it in bubble wrap, and pack it in a strong box with at least 5 cm of padding on all sides. Drives should go in their original box if you have it." },
      { title: "What not to send", text: "Remove external cables, mounting brackets and batteries unless we ask for them. Back up PLC/HMI programs before sending." },
      { title: "Label and courier", text: "Write your repair request number on the box. Use a courier with tracking and keep the receipt." },
    ],
    sendForRepair: ["Upload the photos on the PCB repair page to get a free quote before sending anything"],
    faqs: [
      { q: "Do I have to send the board before getting a quote?", a: "No. Send photos and details first – we send a free quote, usually within 1–2 working days, and you courier the board only if you approve." },
      { q: "Should I send the whole machine?", a: "No – only the faulty board, drive, PLC or HMI. Remove it carefully and keep the wiring labelled for re-installation." },
    ],
  },
];

export function getRepairGuide(slug: string) {
  return REPAIR_GUIDES.find((g) => g.slug === slug);
}

export function guidesForService(serviceSlug: string) {
  return REPAIR_GUIDES.filter((g) => g.service === serviceSlug);
}
