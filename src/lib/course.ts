// The PCB repair course page. Everything here can be changed in Admin → Repair course (stored in
// site_content, key "course"); empty fields are simply not shown – nothing is invented on the page.
export type CourseModule = { title: string; topics: string[] };
export type CourseInfo = {
  active: boolean;
  title: string;
  intro: string;
  mode: string;        // e.g. "Classroom (hands-on)", "Online + practical"
  duration: string;    // e.g. "6 weeks, 3 days a week"
  fee: string;         // e.g. "₹15,000 (incl. GST)"
  language: string;    // e.g. "Hindi & English"
  location: string;    // e.g. "Ahmedabad (address on joining)"
  nextBatch: string;   // e.g. "1 December 2026"
  certificate: string; // e.g. "PCBDukaan certificate after the practical test"
  modules: CourseModule[];
  faqs: { q: string; a: string }[];
};

export const DEFAULT_COURSE: CourseInfo = {
  active: true,
  title: "PCB repair course – industrial board repair (VFD, SMPS, PLC)",
  intro: "Learn to repair industrial circuit boards at component level the way our technicians do it every day: test components, trace faults and repair SMPS, VFD/inverter, PLC and HMI boards – with practice on real boards.",
  mode: "", duration: "", fee: "", language: "", location: "", nextBatch: "", certificate: "",
  modules: [
    { title: "Safety and electronics basics", topics: ["Working safely with mains and charged DC bus capacitors", "ESD protection", "Reading component markings and values", "Series and parallel circuits, Ohm's law in practice"] },
    { title: "Tools, test equipment and soldering", topics: ["Multimeter: voltage, resistance, diode and continuity tests", "ESR/LCR meter and oscilloscope basics", "Safe power-up: isolation transformer, variac, series lamp", "Through-hole soldering, desoldering and SMD hot-air rework"] },
    { title: "Testing components", topics: ["Resistors, capacitors (ESR), diodes and bridge rectifiers", "Transistors, MOSFETs and IGBT modules", "Optocouplers, regulators, relays and fuses", "Finding replacements and equivalents"] },
    { title: "Fault-finding method", topics: ["Visual inspection: burnt, swollen and cracked parts", "Tracing circuits and reading datasheets", "Voltage and resistance mapping", "Comparing with a working board"] },
    { title: "SMPS / power supply repair", topics: ["Rectifier, PFC and the PWM controller", "Start-up and feedback circuits (TL431, optocoupler)", "Typical failures: no output, hiccup, low voltage"] },
    { title: "VFD / inverter repair", topics: ["Rectifier, pre-charge and DC bus", "Testing IGBT modules and gate drivers", "Current sensors and the braking chopper", "Fault codes: oc, ov, Lv, GF and what they point to"] },
    { title: "PLC, I/O and HMI boards", topics: ["Power section and input/output stages", "RS485 / RS232 communication ports", "HMI display backlight and touch problems"] },
    { title: "Testing after repair", topics: ["Load testing and burn-in", "Testing a drive with a motor", "Recording the repair for the customer"] },
  ],
  faqs: [
    { q: "Who is this course for?", a: "Maintenance electricians and technicians, ITI / diploma / engineering students and repair shop owners who want to repair industrial boards at component level." },
    { q: "Do I need electronics knowledge before joining?", a: "Basic electrical knowledge helps. Tell us your background in the enquiry form and we'll tell you whether the course fits you." },
    { q: "How do I join and what does it cost?", a: "Send the enquiry form below – we'll call you with the fee, dates and details." },
    { q: "Where can I start learning for free?", a: "Read our step-by-step repair guides on /repair-guides and the VFD fault-code explanations on /fault-codes." },
  ],
};

export function mergeCourse(saved: Partial<CourseInfo> | null | undefined): CourseInfo {
  const s = saved ?? {};
  return {
    ...DEFAULT_COURSE,
    ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== null)),
    modules: Array.isArray(s.modules) && s.modules.length ? s.modules : DEFAULT_COURSE.modules,
    faqs: Array.isArray(s.faqs) && s.faqs.length ? s.faqs : DEFAULT_COURSE.faqs,
  } as CourseInfo;
}
