// Indian states / UTs and major industrial areas, used for the /locations pages.
// Industries listed are the main sectors each area is known for.

export type Industry =
  | "automotive" | "pharma" | "chemicals" | "textiles" | "steel" | "electronics" | "engineering"
  | "food" | "plastics" | "ceramics" | "power" | "it" | "machine-tools" | "packaging" | "foundry";

export type State = { slug: string; name: string; type: "state" | "ut" };
export type Area = { slug: string; name: string; city: string; state: string; industries: Industry[] };

export const STATES: State[] = [
  { slug: "andhra-pradesh", name: "Andhra Pradesh", type: "state" },
  { slug: "arunachal-pradesh", name: "Arunachal Pradesh", type: "state" },
  { slug: "assam", name: "Assam", type: "state" },
  { slug: "bihar", name: "Bihar", type: "state" },
  { slug: "chhattisgarh", name: "Chhattisgarh", type: "state" },
  { slug: "goa", name: "Goa", type: "state" },
  { slug: "gujarat", name: "Gujarat", type: "state" },
  { slug: "haryana", name: "Haryana", type: "state" },
  { slug: "himachal-pradesh", name: "Himachal Pradesh", type: "state" },
  { slug: "jharkhand", name: "Jharkhand", type: "state" },
  { slug: "karnataka", name: "Karnataka", type: "state" },
  { slug: "kerala", name: "Kerala", type: "state" },
  { slug: "madhya-pradesh", name: "Madhya Pradesh", type: "state" },
  { slug: "maharashtra", name: "Maharashtra", type: "state" },
  { slug: "manipur", name: "Manipur", type: "state" },
  { slug: "meghalaya", name: "Meghalaya", type: "state" },
  { slug: "mizoram", name: "Mizoram", type: "state" },
  { slug: "nagaland", name: "Nagaland", type: "state" },
  { slug: "odisha", name: "Odisha", type: "state" },
  { slug: "punjab", name: "Punjab", type: "state" },
  { slug: "rajasthan", name: "Rajasthan", type: "state" },
  { slug: "sikkim", name: "Sikkim", type: "state" },
  { slug: "tamil-nadu", name: "Tamil Nadu", type: "state" },
  { slug: "telangana", name: "Telangana", type: "state" },
  { slug: "tripura", name: "Tripura", type: "state" },
  { slug: "uttar-pradesh", name: "Uttar Pradesh", type: "state" },
  { slug: "uttarakhand", name: "Uttarakhand", type: "state" },
  { slug: "west-bengal", name: "West Bengal", type: "state" },
  { slug: "andaman-and-nicobar-islands", name: "Andaman and Nicobar Islands", type: "ut" },
  { slug: "chandigarh", name: "Chandigarh", type: "ut" },
  { slug: "dadra-nagar-haveli-daman-diu", name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut" },
  { slug: "delhi", name: "Delhi", type: "ut" },
  { slug: "jammu-and-kashmir", name: "Jammu and Kashmir", type: "ut" },
  { slug: "ladakh", name: "Ladakh", type: "ut" },
  { slug: "lakshadweep", name: "Lakshadweep", type: "ut" },
  { slug: "puducherry", name: "Puducherry", type: "ut" },
];

const a = (slug: string, name: string, city: string, state: string, industries: Industry[]): Area => ({ slug, name, city, state, industries });

export const AREAS: Area[] = [
  // Maharashtra
  a("chakan-midc", "Chakan MIDC", "Pune", "maharashtra", ["automotive", "engineering", "machine-tools"]),
  a("pimpri-chinchwad-midc", "Pimpri-Chinchwad MIDC", "Pune", "maharashtra", ["automotive", "engineering", "electronics"]),
  a("bhosari-midc", "Bhosari MIDC", "Pune", "maharashtra", ["engineering", "automotive", "foundry"]),
  a("ranjangaon-midc", "Ranjangaon MIDC", "Pune", "maharashtra", ["automotive", "food", "electronics"]),
  a("talegaon-midc", "Talegaon MIDC", "Pune", "maharashtra", ["automotive", "engineering", "plastics"]),
  a("hinjewadi", "Hinjewadi", "Pune", "maharashtra", ["it", "electronics"]),
  a("waluj-midc", "Waluj MIDC", "Chhatrapati Sambhajinagar", "maharashtra", ["automotive", "pharma", "engineering"]),
  a("shendra-midc", "Shendra MIDC", "Chhatrapati Sambhajinagar", "maharashtra", ["automotive", "pharma", "food"]),
  a("ambad-midc", "Ambad MIDC", "Nashik", "maharashtra", ["engineering", "electronics", "automotive"]),
  a("satpur-midc", "Satpur MIDC", "Nashik", "maharashtra", ["engineering", "pharma", "electronics"]),
  a("sinnar-midc", "Sinnar MIDC", "Nashik", "maharashtra", ["engineering", "automotive", "power"]),
  a("butibori-midc", "Butibori MIDC", "Nagpur", "maharashtra", ["textiles", "engineering", "steel"]),
  a("hingna-midc", "Hingna MIDC", "Nagpur", "maharashtra", ["engineering", "automotive", "food"]),
  a("taloja-midc", "Taloja MIDC", "Navi Mumbai", "maharashtra", ["chemicals", "pharma", "plastics"]),
  a("ttc-midc-thane-belapur", "TTC MIDC (Thane–Belapur)", "Navi Mumbai", "maharashtra", ["chemicals", "engineering", "electronics"]),
  a("tarapur-midc", "Tarapur MIDC", "Palghar", "maharashtra", ["chemicals", "pharma", "steel"]),
  a("bhiwandi", "Bhiwandi", "Thane", "maharashtra", ["textiles", "packaging", "plastics"]),
  a("shiroli-midc", "Shiroli MIDC", "Kolhapur", "maharashtra", ["foundry", "automotive", "engineering"]),
  a("andheri-midc", "Andheri MIDC (SEEPZ)", "Mumbai", "maharashtra", ["electronics", "pharma", "it"]),

  // Gujarat
  a("sanand-gidc", "Sanand GIDC", "Ahmedabad", "gujarat", ["automotive", "engineering", "food"]),
  a("vatva-gidc", "Vatva GIDC", "Ahmedabad", "gujarat", ["chemicals", "engineering", "pharma"]),
  a("naroda-gidc", "Naroda GIDC", "Ahmedabad", "gujarat", ["chemicals", "engineering", "textiles"]),
  a("changodar", "Changodar", "Ahmedabad", "gujarat", ["pharma", "engineering", "packaging"]),
  a("ankleshwar-gidc", "Ankleshwar GIDC", "Bharuch", "gujarat", ["chemicals", "pharma", "plastics"]),
  a("dahej-pcpir", "Dahej PCPIR", "Bharuch", "gujarat", ["chemicals", "power", "steel"]),
  a("vapi-gidc", "Vapi GIDC", "Valsad", "gujarat", ["chemicals", "pharma", "packaging"]),
  a("sachin-gidc", "Sachin GIDC", "Surat", "gujarat", ["textiles", "chemicals", "engineering"]),
  a("hazira", "Hazira", "Surat", "gujarat", ["steel", "chemicals", "power"]),
  a("makarpura-gidc", "Makarpura GIDC", "Vadodara", "gujarat", ["engineering", "electronics", "power"]),
  a("savli-gidc", "Savli GIDC", "Vadodara", "gujarat", ["engineering", "pharma", "power"]),
  a("halol-gidc", "Halol GIDC", "Panchmahal", "gujarat", ["automotive", "engineering", "plastics"]),
  a("shapar-veraval", "Shapar-Veraval", "Rajkot", "gujarat", ["engineering", "foundry", "automotive"]),
  a("aji-gidc", "Aji GIDC", "Rajkot", "gujarat", ["engineering", "machine-tools", "foundry"]),
  a("morbi", "Morbi Ceramic Zone", "Morbi", "gujarat", ["ceramics", "packaging", "power"]),
  a("jamnagar-gidc", "Jamnagar GIDC (Shankar Tekri)", "Jamnagar", "gujarat", ["engineering", "foundry", "chemicals"]),
  a("mundra-sez", "Mundra SEZ", "Kutch", "gujarat", ["power", "steel", "chemicals"]),

  // Tamil Nadu
  a("sriperumbudur", "Sriperumbudur", "Kanchipuram", "tamil-nadu", ["electronics", "automotive", "engineering"]),
  a("oragadam", "Oragadam", "Kanchipuram", "tamil-nadu", ["automotive", "engineering", "electronics"]),
  a("ambattur-industrial-estate", "Ambattur Industrial Estate", "Chennai", "tamil-nadu", ["engineering", "automotive", "electronics"]),
  a("guindy-industrial-estate", "Guindy Industrial Estate", "Chennai", "tamil-nadu", ["engineering", "electronics", "it"]),
  a("irungattukottai-sipcot", "Irungattukottai SIPCOT", "Kanchipuram", "tamil-nadu", ["automotive", "electronics", "plastics"]),
  a("mahindra-world-city-chennai", "Mahindra World City", "Chengalpattu", "tamil-nadu", ["automotive", "electronics", "it"]),
  a("gummidipoondi-sipcot", "Gummidipoondi SIPCOT", "Tiruvallur", "tamil-nadu", ["steel", "chemicals", "engineering"]),
  a("hosur-sipcot", "Hosur SIPCOT", "Krishnagiri", "tamil-nadu", ["automotive", "electronics", "engineering"]),
  a("kurichi-sidco", "Kurichi SIDCO", "Coimbatore", "tamil-nadu", ["engineering", "foundry", "machine-tools"]),
  a("tiruppur", "Tiruppur Knitwear Cluster", "Tiruppur", "tamil-nadu", ["textiles", "packaging", "power"]),

  // Karnataka
  a("peenya", "Peenya Industrial Area", "Bengaluru", "karnataka", ["engineering", "machine-tools", "electronics"]),
  a("bommasandra", "Bommasandra", "Bengaluru", "karnataka", ["electronics", "pharma", "automotive"]),
  a("electronic-city", "Electronic City", "Bengaluru", "karnataka", ["electronics", "it"]),
  a("whitefield-epip", "Whitefield EPIP", "Bengaluru", "karnataka", ["electronics", "it", "engineering"]),
  a("jigani", "Jigani", "Bengaluru", "karnataka", ["engineering", "pharma", "electronics"]),
  a("narasapura", "Narasapura", "Kolar", "karnataka", ["automotive", "engineering"]),
  a("belur-industrial-area", "Belur Industrial Area", "Dharwad", "karnataka", ["engineering", "automotive", "food"]),
  a("hebbal-hootagalli", "Hebbal–Hootagalli", "Mysuru", "karnataka", ["automotive", "electronics", "engineering"]),
  a("udyambag", "Udyambag", "Belagavi", "karnataka", ["foundry", "engineering", "automotive"]),

  // Telangana
  a("jeedimetla-ida", "Jeedimetla IDA", "Hyderabad", "telangana", ["pharma", "engineering", "plastics"]),
  a("patancheru-ida", "Patancheru IDA", "Sangareddy", "telangana", ["pharma", "chemicals", "engineering"]),
  a("bollaram-ida", "Bollaram IDA", "Sangareddy", "telangana", ["pharma", "chemicals"]),
  a("genome-valley", "Genome Valley", "Hyderabad", "telangana", ["pharma", "it"]),
  a("cherlapally-ida", "Cherlapally IDA", "Hyderabad", "telangana", ["engineering", "plastics", "electronics"]),
  a("balanagar", "Balanagar", "Hyderabad", "telangana", ["engineering", "electronics", "machine-tools"]),
  a("pashamylaram", "Pashamylaram", "Sangareddy", "telangana", ["pharma", "chemicals", "engineering"]),

  // Andhra Pradesh
  a("sri-city", "Sri City", "Tirupati", "andhra-pradesh", ["electronics", "food", "engineering"]),
  a("parawada-pharma-city", "Parawada Pharma City", "Visakhapatnam", "andhra-pradesh", ["pharma", "chemicals"]),
  a("autonagar-vijayawada", "Autonagar", "Vijayawada", "andhra-pradesh", ["automotive", "engineering"]),
  a("penukonda", "Penukonda", "Sri Sathya Sai", "andhra-pradesh", ["automotive", "engineering"]),
  a("kakinada-sez", "Kakinada SEZ", "Kakinada", "andhra-pradesh", ["chemicals", "power", "food"]),

  // Kerala
  a("kakkanad", "Kakkanad (KINFRA)", "Kochi", "kerala", ["electronics", "it", "food"]),
  a("kalamassery", "Kalamassery", "Kochi", "kerala", ["engineering", "chemicals", "electronics"]),
  a("technopark", "Technopark", "Thiruvananthapuram", "kerala", ["it", "electronics"]),

  // Uttar Pradesh
  a("noida-phase-2", "Noida Phase 2 & NSEZ", "Noida", "uttar-pradesh", ["electronics", "it", "engineering"]),
  a("greater-noida", "Greater Noida (Ecotech)", "Greater Noida", "uttar-pradesh", ["electronics", "automotive", "engineering"]),
  a("sahibabad", "Sahibabad Industrial Area", "Ghaziabad", "uttar-pradesh", ["engineering", "plastics", "electronics"]),
  a("panki-industrial-area", "Panki Industrial Area", "Kanpur", "uttar-pradesh", ["engineering", "chemicals", "textiles"]),
  a("chinhat-industrial-area", "Chinhat Industrial Area", "Lucknow", "uttar-pradesh", ["engineering", "food", "electronics"]),
  a("foundry-nagar", "Foundry Nagar", "Agra", "uttar-pradesh", ["foundry", "engineering"]),

  // Haryana
  a("imt-manesar", "IMT Manesar", "Gurugram", "haryana", ["automotive", "engineering", "electronics"]),
  a("udyog-vihar", "Udyog Vihar", "Gurugram", "haryana", ["electronics", "it", "textiles"]),
  a("faridabad-industrial-area", "Faridabad Industrial Area", "Faridabad", "haryana", ["engineering", "automotive", "electronics"]),
  a("bawal", "Bawal", "Rewari", "haryana", ["automotive", "engineering"]),
  a("dharuhera", "Dharuhera", "Rewari", "haryana", ["automotive", "engineering", "plastics"]),
  a("kundli", "Kundli HSIIDC", "Sonipat", "haryana", ["engineering", "food", "plastics"]),
  a("bahadurgarh", "Bahadurgarh", "Jhajjar", "haryana", ["plastics", "engineering", "chemicals"]),
  a("panipat", "Panipat", "Panipat", "haryana", ["textiles", "chemicals", "power"]),

  // Delhi
  a("okhla-industrial-area", "Okhla Industrial Area", "New Delhi", "delhi", ["electronics", "textiles", "engineering"]),
  a("naraina-industrial-area", "Naraina Industrial Area", "New Delhi", "delhi", ["engineering", "packaging", "electronics"]),
  a("wazirpur", "Wazirpur", "New Delhi", "delhi", ["steel", "engineering"]),
  a("bawana", "Bawana", "New Delhi", "delhi", ["plastics", "engineering", "electronics"]),
  a("mayapuri", "Mayapuri", "New Delhi", "delhi", ["automotive", "engineering"]),

  // Punjab
  a("ludhiana-focal-point", "Ludhiana Focal Point", "Ludhiana", "punjab", ["engineering", "automotive", "textiles"]),
  a("mohali-industrial-area", "Mohali Industrial Area", "Mohali", "punjab", ["electronics", "it", "engineering"]),
  a("jalandhar", "Jalandhar Industrial Area", "Jalandhar", "punjab", ["engineering", "machine-tools", "plastics"]),
  a("rajpura", "Rajpura", "Patiala", "punjab", ["food", "engineering", "power"]),
  a("amritsar-focal-point", "Amritsar Focal Point", "Amritsar", "punjab", ["textiles", "engineering", "food"]),

  // Himachal Pradesh
  a("baddi", "Baddi–Barotiwala–Nalagarh", "Solan", "himachal-pradesh", ["pharma", "food", "packaging"]),
  a("parwanoo", "Parwanoo", "Solan", "himachal-pradesh", ["engineering", "electronics", "food"]),
  a("kala-amb", "Kala Amb", "Sirmaur", "himachal-pradesh", ["pharma", "steel", "packaging"]),

  // Uttarakhand
  a("sidcul-haridwar", "SIIDCUL Haridwar", "Haridwar", "uttarakhand", ["automotive", "food", "pharma"]),
  a("pantnagar", "SIIDCUL Pantnagar", "Udham Singh Nagar", "uttarakhand", ["automotive", "food", "packaging"]),
  a("sitarganj", "Sitarganj", "Udham Singh Nagar", "uttarakhand", ["engineering", "plastics"]),
  a("selaqui", "Selaqui", "Dehradun", "uttarakhand", ["pharma", "electronics"]),

  // Rajasthan
  a("bhiwadi", "Bhiwadi RIICO", "Khairthal-Tijara", "rajasthan", ["automotive", "engineering", "electronics"]),
  a("neemrana", "Neemrana", "Kotputli-Behror", "rajasthan", ["automotive", "electronics", "engineering"]),
  a("sitapura", "Sitapura", "Jaipur", "rajasthan", ["engineering", "electronics", "textiles"]),
  a("vki-jaipur", "VKI Area", "Jaipur", "rajasthan", ["engineering", "plastics", "food"]),
  a("boranada", "Boranada", "Jodhpur", "rajasthan", ["food", "engineering", "textiles"]),
  a("madri", "Madri", "Udaipur", "rajasthan", ["engineering", "chemicals"]),
  a("kota-industrial-area", "Kota Industrial Area", "Kota", "rajasthan", ["chemicals", "power", "engineering"]),

  // Madhya Pradesh
  a("pithampur", "Pithampur", "Dhar", "madhya-pradesh", ["automotive", "pharma", "engineering"]),
  a("mandideep", "Mandideep", "Raisen", "madhya-pradesh", ["engineering", "pharma", "food"]),
  a("dewas", "Dewas Industrial Area", "Dewas", "madhya-pradesh", ["engineering", "pharma", "automotive"]),
  a("sanwer-road", "Sanwer Road", "Indore", "madhya-pradesh", ["engineering", "food", "plastics"]),
  a("malanpur", "Malanpur", "Bhind", "madhya-pradesh", ["food", "engineering", "steel"]),
  a("richhai", "Richhai", "Jabalpur", "madhya-pradesh", ["engineering", "food"]),

  // Chhattisgarh
  a("bhilai", "Bhilai", "Durg", "chhattisgarh", ["steel", "engineering", "power"]),
  a("urla", "Urla Industrial Area", "Raipur", "chhattisgarh", ["steel", "engineering", "foundry"]),
  a("siltara", "Siltara", "Raipur", "chhattisgarh", ["steel", "power"]),
  a("korba", "Korba", "Korba", "chhattisgarh", ["power", "steel"]),

  // Odisha
  a("jharsuguda", "Jharsuguda", "Jharsuguda", "odisha", ["steel", "power"]),
  a("angul", "Angul–Talcher", "Angul", "odisha", ["steel", "power"]),
  a("kalinganagar", "Kalinganagar", "Jajpur", "odisha", ["steel", "engineering"]),
  a("mancheswar", "Mancheswar Industrial Estate", "Bhubaneswar", "odisha", ["engineering", "electronics", "food"]),
  a("paradip", "Paradip", "Jagatsinghpur", "odisha", ["chemicals", "power", "steel"]),

  // Jharkhand
  a("adityapur", "Adityapur Industrial Area", "Jamshedpur", "jharkhand", ["automotive", "steel", "engineering"]),
  a("bokaro", "Bokaro", "Bokaro", "jharkhand", ["steel", "engineering"]),
  a("tupudana", "Tupudana", "Ranchi", "jharkhand", ["engineering", "steel"]),

  // West Bengal
  a("howrah", "Howrah Industrial Belt", "Howrah", "west-bengal", ["engineering", "foundry", "steel"]),
  a("kalyani", "Kalyani", "Nadia", "west-bengal", ["engineering", "food", "pharma"]),
  a("durgapur", "Durgapur", "Paschim Bardhaman", "west-bengal", ["steel", "power", "engineering"]),
  a("haldia", "Haldia", "Purba Medinipur", "west-bengal", ["chemicals", "power", "steel"]),
  a("salt-lake-sector-v", "Salt Lake Sector V", "Kolkata", "west-bengal", ["it", "electronics"]),

  // Bihar
  a("hajipur", "Hajipur Industrial Area", "Vaishali", "bihar", ["food", "engineering"]),
  a("bihta", "Bihta", "Patna", "bihar", ["food", "plastics", "engineering"]),

  // Assam & North East
  a("amingaon", "Amingaon", "Guwahati", "assam", ["engineering", "food", "plastics"]),
  a("tinsukia", "Tinsukia–Digboi", "Tinsukia", "assam", ["chemicals", "power"]),
  a("byrnihat", "Byrnihat", "Ri-Bhoi", "meghalaya", ["steel", "engineering"]),
  a("rangpo", "Rangpo", "Pakyong", "sikkim", ["pharma"]),
  a("bodhjungnagar", "Bodhjungnagar", "West Tripura", "tripura", ["food", "plastics"]),
  a("dimapur", "Dimapur", "Chümoukedima", "nagaland", ["food", "engineering"]),

  // Goa
  a("verna", "Verna Industrial Estate", "South Goa", "goa", ["pharma", "electronics", "engineering"]),
  a("kundaim", "Kundaim", "North Goa", "goa", ["pharma", "engineering", "packaging"]),

  // Union territories
  a("kathua", "Kathua Industrial Estate", "Kathua", "jammu-and-kashmir", ["engineering", "food", "steel"]),
  a("bari-brahmana", "Bari Brahmana", "Samba", "jammu-and-kashmir", ["engineering", "pharma", "food"]),
  a("chandigarh-industrial-area", "Chandigarh Industrial Area", "Chandigarh", "chandigarh", ["engineering", "electronics"]),
  a("silvassa", "Silvassa", "Dadra and Nagar Haveli", "dadra-nagar-haveli-daman-diu", ["plastics", "textiles", "engineering"]),
  a("daman", "Daman Industrial Area", "Daman", "dadra-nagar-haveli-daman-diu", ["plastics", "packaging", "pharma"]),
  a("thirubhuvanai", "Thirubhuvanai", "Puducherry", "puducherry", ["engineering", "electronics", "pharma"]),
];

export const INDUSTRY_LABEL: Record<Industry, string> = {
  automotive: "automotive and auto-component",
  pharma: "pharmaceutical",
  chemicals: "chemical and petrochemical",
  textiles: "textile",
  steel: "steel and metal",
  electronics: "electronics manufacturing",
  engineering: "engineering",
  food: "food processing",
  plastics: "plastics and moulding",
  ceramics: "ceramic tile",
  power: "power and energy",
  it: "IT and electronics",
  "machine-tools": "machine tool and CNC",
  packaging: "packaging",
  foundry: "foundry and casting",
};

// What factories in each industry typically need from us.
export const INDUSTRY_NEEDS: Record<Industry, { boards: string[]; categories: string[] }> = {
  automotive: { boards: ["PLC and I/O cards", "servo and VFD drive boards", "welding controller boards"], categories: ["plc-io-modules", "vfd-motor-drives", "industrial-sensors"] },
  pharma: { boards: ["HMI and PLC boards", "weighing indicators", "temperature controller boards"], categories: ["plc-io-modules", "load-cells-weighing", "displays-hmi"] },
  chemicals: { boards: ["transmitter and signal converter boards", "PLC I/O cards", "SMPS units"], categories: ["industrial-sensors", "plc-io-modules", "communication-modules"] },
  textiles: { boards: ["VFD drive boards", "machine control cards", "SMPS units"], categories: ["vfd-motor-drives", "industrial-control-boards", "smps-power-supplies"] },
  steel: { boards: ["VFD and DC drive boards", "IGBT power stages", "crane and furnace controller boards"], categories: ["vfd-motor-drives", "relays-power-components", "smps-power-supplies"] },
  electronics: { boards: ["SMPS and power boards", "test-jig controller boards", "communication interface boards"], categories: ["test-repair-tools", "smps-power-supplies", "communication-modules"] },
  engineering: { boards: ["CNC and machine control boards", "VFD drive boards", "PLC cards"], categories: ["industrial-control-boards", "vfd-motor-drives", "plc-io-modules"] },
  food: { boards: ["weighing and checkweigher boards", "packing machine controllers", "temperature controllers"], categories: ["load-cells-weighing", "industrial-control-boards", "industrial-sensors"] },
  plastics: { boards: ["injection moulding controller boards", "temperature controller and SSR boards", "VFD drives"], categories: ["industrial-control-boards", "relays-power-components", "vfd-motor-drives"] },
  ceramics: { boards: ["kiln temperature controller boards", "VFD drive boards", "PLC cards"], categories: ["industrial-control-boards", "vfd-motor-drives", "plc-io-modules"] },
  power: { boards: ["inverter and UPS control cards", "IGBT gate driver boards", "SMPS units"], categories: ["smps-power-supplies", "relays-power-components", "vfd-motor-drives"] },
  it: { boards: ["UPS and SMPS boards", "communication interface boards"], categories: ["smps-power-supplies", "communication-modules", "test-repair-tools"] },
  "machine-tools": { boards: ["CNC servo and spindle drive boards", "stepper driver boards", "HMI panels"], categories: ["vfd-motor-drives", "displays-hmi", "plc-io-modules"] },
  packaging: { boards: ["packing machine PLC boards", "load cell and weigher boards", "photoelectric sensor boards"], categories: ["plc-io-modules", "load-cells-weighing", "industrial-sensors"] },
  foundry: { boards: ["induction furnace control boards", "IGBT power stages", "temperature controller boards"], categories: ["relays-power-components", "industrial-control-boards", "industrial-sensors"] },
};

export function getState(slug: string) {
  return STATES.find((s) => s.slug === slug) ?? null;
}

export function areasIn(stateSlug: string) {
  return AREAS.filter((x) => x.state === stateSlug);
}

export function getArea(stateSlug: string, areaSlug: string) {
  return AREAS.find((x) => x.state === stateSlug && x.slug === areaSlug) ?? null;
}

// Combined needs for a set of industries, without duplicates.
export function needsFor(industries: Industry[]) {
  const boards = [...new Set(industries.flatMap((i) => INDUSTRY_NEEDS[i].boards))];
  const categories = [...new Set(industries.flatMap((i) => INDUSTRY_NEEDS[i].categories))];
  return { boards, categories };
}

export function listText(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function stateIndustries(stateSlug: string): Industry[] {
  const counts = new Map<Industry, number>();
  for (const x of areasIn(stateSlug)) for (const i of x.industries) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((p, q) => q[1] - p[1]).map(([i]) => i);
}

// The biggest industrial clusters: these area pages are shown to search engines (sitemap, indexed) and carry
// their own description. The other area pages stay on the site for visitors but are "noindex", so Google
// doesn't see ~150 near-identical pages. Key: "<state>/<area>".
export const FEATURED_AREAS: Record<string, string> = {
  "maharashtra/chakan-midc": "Chakan, north of Pune, is one of India's biggest automotive belts. Vehicle and component plants here run press lines, welding robots and conveyors on VFDs and servo drives – the boards we repair most often.",
  "maharashtra/pimpri-chinchwad-midc": "Pimpri-Chinchwad has been Pune's engineering heartland for decades, with auto, electrical and machine-building units whose older machines depend on hard-to-find control cards and drive boards.",
  "maharashtra/bhosari-midc": "Bhosari's small and mid-size engineering, foundry and auto-component shops run CNC machines, induction heaters and press controls – ideal for component-level repair instead of costly replacements.",
  "maharashtra/waluj-midc": "Waluj near Chhatrapati Sambhajinagar (Aurangabad) is a major auto and pharma cluster, where packaging lines, compressors and conveyors rely on PLCs, HMIs and drives.",
  "maharashtra/ambad-midc": "Ambad MIDC in Nashik hosts electrical, auto-component and engineering units, with many panel builders and machine shops that need SMPS, relays and drive boards quickly.",
  "maharashtra/ttc-midc-thane-belapur": "The Thane–Belapur (TTC) belt in Navi Mumbai mixes chemical, pharma and engineering plants – pumps, agitators and dosing systems that run on VFDs and PLCs.",
  "maharashtra/taloja-midc": "Taloja MIDC is a chemicals, steel-processing and pharma estate where process pumps, blowers and furnaces depend on drives, temperature controllers and SMPS.",
  "maharashtra/bhiwandi": "Bhiwandi is a powerloom and warehousing hub. Loom controllers, inverter cards and conveyor drives here fail often with dust and voltage swings – common repair jobs for us.",
  "gujarat/vatva-gidc": "Vatva GIDC in Ahmedabad is a dense chemical, dyes and engineering estate where reactors, pumps and blowers rely on VFDs, PLCs and temperature controllers.",
  "gujarat/naroda-gidc": "Naroda GIDC has engineering, pharma and plastics units – injection moulding machines, extruders and packaging lines with servo drives and HMIs.",
  "gujarat/sanand-gidc": "Sanand, west of Ahmedabad, grew around automobile plants and their suppliers – robots, presses and conveyors that need fast drive and PLC support.",
  "gujarat/makarpura-gidc": "Makarpura GIDC in Vadodara has engineering, electrical and pharma units, including many makers and users of switchgear, panels and process equipment.",
  "gujarat/shapar-veraval": "Shapar-Veraval near Rajkot is packed with foundries, CNC job shops and pump makers – induction furnace cards, CNC drives and SMPS are everyday needs.",
  "gujarat/aji-gidc": "Aji GIDC in Rajkot is a hub of small engineering and machine-tool units, where older CNC and lathe controllers often can only be kept running by repair.",
  "gujarat/morbi": "Morbi is India's ceramic tile capital. Kilns, presses, glaze lines and big fans run on high-power VFDs and PLCs, and downtime is expensive – fast drive repair matters here.",
  "gujarat/ankleshwar-gidc": "Ankleshwar is one of Asia's largest chemical estates. Reactors, centrifuges, pumps and effluent plants depend on drives, PLCs and flame-proof control systems.",
  "gujarat/vapi-gidc": "Vapi GIDC combines chemicals, pharma and paper units with plenty of pumps, dryers and packing machines that use VFDs, PLCs and weighing systems.",
  "gujarat/sachin-gidc": "Sachin GIDC near Surat is a textile processing and chemicals area – stenters, jet dyeing machines and looms run on drives, PLCs and temperature controllers.",
  "tamil-nadu/sriperumbudur": "Sriperumbudur near Chennai is an automotive and electronics manufacturing corridor, where assembly lines use servo drives, PLCs, sensors and HMIs.",
  "tamil-nadu/ambattur-industrial-estate": "Ambattur is one of Chennai's oldest industrial estates, with thousands of small engineering, auto-component and fabrication units running CNCs and presses.",
  "tamil-nadu/hosur-sipcot": "Hosur's SIPCOT estates host two-wheeler, truck and auto-component plants plus electronics makers – a strong user base for drives, PLCs and servo systems.",
  "tamil-nadu/kurichi-sidco": "Kurichi SIDCO in Coimbatore is home to pump, motor and foundry units – Coimbatore's pump industry relies heavily on drives, starters and control cards.",
  "tamil-nadu/tiruppur": "Tiruppur is India's knitwear hub. Knitting, dyeing and compacting machines run on inverters, PLCs and temperature controllers that need quick repair in peak season.",
  "karnataka/peenya": "Peenya in Bengaluru is one of Asia's largest industrial areas, with thousands of machine-tool, engineering and electronics units – a big user of CNC drives and controllers.",
  "karnataka/bommasandra": "Bommasandra and the Hosur Road belt host auto-component, electronics and pharma plants with automated lines on PLCs, servos and sensors.",
  "telangana/jeedimetla-ida": "Jeedimetla in Hyderabad has pharma, plastics and engineering units – granulators, blister packing machines and moulding machines run on drives and PLCs.",
  "telangana/patancheru-ida": "Patancheru is a pharma and chemicals belt west of Hyderabad, where reactors, dryers and utilities depend on VFDs, PLCs and process controllers.",
  "haryana/imt-manesar": "IMT Manesar is a major automobile and auto-component hub near Gurugram, with robotic welding, paint shops and presses using servo drives and PLCs.",
  "haryana/faridabad-industrial-area": "Faridabad is one of North India's oldest industrial towns – forging, fabrication, auto-component and electrical units with many ageing machines that are best kept running by repair.",
  "haryana/panipat": "Panipat is India's textile recycling and handloom hub; spinning and weaving machines, blowers and dryers run on inverters and motor controls.",
  "delhi/okhla-industrial-area": "Okhla is Delhi's best-known industrial area, mixing garment exporters, printing and packaging units and electronics workshops that use PLCs, drives and SMPS.",
  "uttar-pradesh/noida-phase-2": "Noida Phase 2 and the Noida SEZ host electronics, mobile and garment manufacturing – SMT lines, testers and packing machines with sensitive control electronics.",
  "punjab/ludhiana-focal-point": "Ludhiana's Focal Points are full of hosiery, bicycle-part, auto-part and machine-tool units – induction heaters, CNCs and knitting machines are common repair jobs.",
  "himachal-pradesh/baddi": "Baddi–Barotiwala–Nalagarh is India's largest pharma cluster, where tablet presses, blister and cartoning machines run on PLCs, HMIs, servo drives and weighing systems.",
  "uttarakhand/sidcul-haridwar": "SIIDCUL Haridwar hosts FMCG, pharma and automobile plants with packing lines, filling machines and conveyors controlled by PLCs and drives.",
  "uttarakhand/pantnagar": "SIIDCUL Pantnagar is an automobile, FMCG and electrical goods cluster with automated assembly and packing lines.",
  "rajasthan/bhiwadi": "Bhiwadi, on the Delhi–Jaipur corridor, has auto-component, steel, electronics and FMCG plants – a strong market for drives, PLCs and power supplies.",
  "madhya-pradesh/pithampur": "Pithampur near Indore is central India's main auto and pharma hub, with commercial-vehicle plants, component makers and packaging lines on drives and PLCs.",
  "jharkhand/adityapur": "Adityapur near Jamshedpur supplies the steel and automobile majors – forging, machining and fabrication units with induction heaters, CNCs and VFDs.",
  "west-bengal/howrah": "The Howrah belt is one of India's oldest engineering clusters – foundries, rolling mills and fabrication shops with ageing controls that are often only repairable.",
  "chhattisgarh/siltara": "Siltara near Raipur is a steel and sponge-iron cluster, where kilns, crushers and rolling mills depend on large drives, PLCs and furnace controls.",
};

export function isFeaturedArea(stateSlug: string, areaSlug: string) {
  return `${stateSlug}/${areaSlug}` in FEATURED_AREAS;
}
