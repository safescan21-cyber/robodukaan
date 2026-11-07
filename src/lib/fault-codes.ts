// VFD / AC drive fault code library (English). Codes are the common ones shown on the keypad of
// each series; exact meanings differ between series and firmware, so pages tell readers to check
// the drive manual. `board` = this fault often points to a power/control board problem we repair.

export type FaultCode = {
  code: string;
  name: string;
  causes: string[];
  check: string[];
  board?: boolean;
};

export type DriveBrand = {
  slug: string;
  brand: string;
  series: string;
  intro: string;
  codes: FaultCode[];
};

const overcurrentChecks = [
  "Disconnect the motor cable and run the drive without load: if the fault stays, the drive itself is faulty",
  "Megger the motor and cable for insulation or phase-to-phase faults",
  "Increase acceleration/deceleration time; check for mechanical jams",
];
const overvoltageChecks = [
  "Increase the deceleration time or enable the stall/overvoltage prevention function",
  "Check the braking resistor and braking transistor (if fitted)",
  "Measure the supply voltage – it should be within the drive's rating",
];
const undervoltageChecks = [
  "Measure all three input phases under load",
  "Check input fuses, contactor and loose terminals",
  "If the supply is fine, check the DC bus capacitors and pre-charge circuit",
];
const overheatChecks = [
  "Clean the heatsink and check that the cooling fan runs",
  "Check the panel temperature and ventilation",
  "Reduce the load or carrier frequency",
];
const groundFaultChecks = [
  "Megger the motor and cable to earth",
  "Check for water or dust in the motor terminal box",
  "If insulation is fine, the output IGBT or current sensor may be faulty",
];

export const DRIVE_BRANDS: DriveBrand[] = [
  {
    slug: "delta",
    brand: "Delta",
    series: "VFD-M, VFD-E, VFD-EL, MS300, C2000",
    intro: "Delta drives are among the most common VFDs in Indian factories. These are the codes you'll see most often on VFD-M, VFD-E and newer series.",
    codes: [
      { code: "oc / ocA / ocd / ocn", name: "Overcurrent (during acceleration / deceleration / constant speed)", causes: ["Acceleration or deceleration time too short", "Short circuit or earth fault in the motor or cable", "Damaged IGBT or current sensor"], check: overcurrentChecks, board: true },
      { code: "ov / ovA / ovd / ovn", name: "DC bus overvoltage", causes: ["Deceleration too fast (regenerated energy)", "High supply voltage", "Braking resistor or brake transistor faulty"], check: overvoltageChecks },
      { code: "Lv", name: "Low voltage on the DC bus", causes: ["Supply voltage too low or a phase missing", "Weak DC bus capacitors", "Faulty pre-charge relay or resistor"], check: undervoltageChecks, board: true },
      { code: "oH / oH1", name: "Drive overheating (heatsink / IGBT)", causes: ["Blocked heatsink or failed fan", "High panel temperature", "Faulty temperature sensor"], check: overheatChecks },
      { code: "oL", name: "Drive overload", causes: ["Load higher than the drive rating for too long", "Wrong motor parameters"], check: ["Compare motor current with the drive's rated current", "Check the motor and machine for mechanical problems"] },
      { code: "oL1", name: "Motor overload (electronic thermal)", causes: ["Motor overloaded", "Wrong motor rated current setting"], check: ["Check the motor rated current parameter", "Check the load and motor cooling"] },
      { code: "GFF", name: "Ground (earth) fault", causes: ["Motor or cable insulation failure", "Damaged output stage"], check: groundFaultChecks, board: true },
      { code: "PHL", name: "Input phase loss", causes: ["Missing or weak supply phase", "Loose input terminals", "DC bus ripple from aged capacitors"], check: undervoltageChecks, board: true },
      { code: "cF1 / cF2", name: "Internal memory (EEPROM) error", causes: ["Control board memory fault", "Power interruption while saving parameters"], check: ["Reset to factory settings and set parameters again", "If it repeats, the control board needs repair"], board: true },
      { code: "HPF", name: "Hardware protection failure", causes: ["Fault in the protection circuit on the power or control board"], check: ["Power off, wait for the DC bus to discharge, power on again", "Repeating HPF usually means board repair"], board: true },
    ],
  },
  {
    slug: "yaskawa",
    brand: "Yaskawa",
    series: "V1000, J1000, A1000, GA500, GA700",
    intro: "Yaskawa drives show short fault codes on the keypad. The same codes are used across V1000, A1000 and the newer GA series.",
    codes: [
      { code: "oC", name: "Overcurrent", causes: ["Short circuit or earth fault on the output", "Acceleration time too short", "Damaged IGBT or current sensor"], check: overcurrentChecks, board: true },
      { code: "GF", name: "Ground fault", causes: ["Motor or cable insulation failure", "Moisture in the motor"], check: groundFaultChecks, board: true },
      { code: "ov", name: "DC bus overvoltage", causes: ["Deceleration too fast", "High or unstable supply voltage", "Braking resistor missing or faulty"], check: overvoltageChecks },
      { code: "Uv1", name: "DC bus undervoltage", causes: ["Low supply voltage or phase loss", "Faulty pre-charge circuit"], check: undervoltageChecks, board: true },
      { code: "Uv2", name: "Control power supply undervoltage", causes: ["Fault in the drive's internal power supply (SMPS)"], check: ["Check the 24 V control supply and external loads on it", "Usually needs control/power board repair"], board: true },
      { code: "Uv3", name: "Soft-charge circuit fault", causes: ["Faulty pre-charge relay or resistor"], check: ["Needs power board inspection"], board: true },
      { code: "oH / oH1", name: "Heatsink overheat", causes: ["Fan failure or blocked heatsink", "High ambient temperature"], check: overheatChecks },
      { code: "oL1", name: "Motor overload", causes: ["Motor overloaded", "Wrong motor rated current setting"], check: ["Check E2-01 (motor rated current) and the load"] },
      { code: "oL2", name: "Drive overload", causes: ["Load too high for the drive", "Carrier frequency too high"], check: ["Reduce load or carrier frequency, or use a larger drive"] },
      { code: "PF", name: "Input phase loss", causes: ["Missing supply phase", "Loose input wiring", "Aged DC bus capacitors"], check: undervoltageChecks, board: true },
      { code: "LF", name: "Output phase loss", causes: ["Broken motor cable or winding", "Loose output terminal"], check: ["Check motor cable continuity and terminals", "Measure the motor windings"] },
      { code: "SC", name: "Short circuit / IGBT fault", causes: ["Output short circuit", "Failed IGBT"], check: ["Disconnect the motor and test: if SC remains, the IGBT/power board needs repair"], board: true },
      { code: "CPF02 – CPF26", name: "Control circuit errors", causes: ["Control board fault", "Electrical noise"], check: ["Check grounding and shielding", "Repeating CPF errors need control board repair"], board: true },
    ],
  },
  {
    slug: "mitsubishi",
    brand: "Mitsubishi Electric",
    series: "FR-D700, FR-E700, FR-A700, FR-E800, FR-A800",
    intro: "Mitsubishi FR series inverters show faults as E.xxx. The most common ones are listed below.",
    codes: [
      { code: "E.OC1 / E.OC2 / E.OC3", name: "Overcurrent during acceleration / constant speed / deceleration", causes: ["Acceleration or deceleration too fast", "Output short circuit or earth fault", "Damaged IGBT"], check: overcurrentChecks, board: true },
      { code: "E.OV1 / E.OV2 / E.OV3", name: "Regenerative overvoltage during acceleration / constant speed / deceleration", causes: ["Deceleration too fast", "Load driving the motor", "Brake resistor fault"], check: overvoltageChecks },
      { code: "E.THT", name: "Inverter overload (electronic thermal)", causes: ["Load too high for the inverter"], check: ["Reduce load or use a larger inverter"] },
      { code: "E.THM", name: "Motor overload (electronic thermal)", causes: ["Motor overloaded", "Wrong electronic thermal setting (Pr. 9)"], check: ["Check Pr. 9 and the motor load"] },
      { code: "E.FIN", name: "Heatsink overheat", causes: ["Fan failure", "Blocked heatsink", "High panel temperature"], check: overheatChecks },
      { code: "E.UVT", name: "Undervoltage", causes: ["Low supply voltage", "Faulty pre-charge circuit"], check: undervoltageChecks, board: true },
      { code: "E.ILF", name: "Input phase loss", causes: ["Missing supply phase"], check: undervoltageChecks },
      { code: "E.LF", name: "Output phase loss", causes: ["Broken motor cable or winding"], check: ["Check motor cable continuity and windings"] },
      { code: "E.GF", name: "Output side earth fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "E.BE", name: "Brake transistor alarm", causes: ["Brake transistor damaged", "Brake resistor value too low"], check: ["Check the brake resistor value", "Brake transistor failure needs power board repair"], board: true },
      { code: "E.CPU", name: "CPU fault", causes: ["Control board fault", "Strong electrical noise"], check: ["Check grounding; repeating E.CPU needs control board repair"], board: true },
    ],
  },
  {
    slug: "siemens",
    brand: "Siemens",
    series: "MICROMASTER 420 / 430 / 440, SINAMICS V20",
    intro: "Siemens MICROMASTER drives and the SINAMICS V20 show faults as Fxxxx. These are the most frequent ones.",
    codes: [
      { code: "F0001", name: "Overcurrent", causes: ["Motor cable short circuit or earth fault", "Motor power doesn't match the drive", "Damaged power stage"], check: overcurrentChecks, board: true },
      { code: "F0002", name: "DC link overvoltage", causes: ["Deceleration too fast", "High supply voltage", "Regenerative load"], check: overvoltageChecks },
      { code: "F0003", name: "Undervoltage", causes: ["Supply failure or dip", "Missing phase"], check: undervoltageChecks, board: true },
      { code: "F0004", name: "Inverter overtemperature", causes: ["Fan failure", "High ambient temperature", "Blocked air flow"], check: overheatChecks },
      { code: "F0005", name: "Inverter I²t overload", causes: ["Drive overloaded", "Duty cycle too high"], check: ["Reduce load or duty cycle"] },
      { code: "F0011", name: "Motor overtemperature (I²t)", causes: ["Motor overloaded", "Wrong motor data"], check: ["Check motor data parameters and the load"] },
      { code: "F0020", name: "Supply phase missing", causes: ["One input phase missing"], check: undervoltageChecks },
      { code: "F0021", name: "Earth fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "F0022", name: "Power stack fault (hardware monitoring)", causes: ["IGBT or gate driver failure", "Short circuit on the output"], check: ["Disconnect the motor; if the fault remains, the power board needs repair"], board: true },
    ],
  },
  {
    slug: "abb",
    brand: "ABB",
    series: "ACS150, ACS310, ACS355, ACS550",
    intro: "ABB general-purpose drives show a fault number and name on the panel. These are the most common on ACS150/310/355/550.",
    codes: [
      { code: "0001 OVERCURRENT", name: "Output current too high", causes: ["Acceleration too fast", "Motor or cable fault", "Damaged power stage"], check: overcurrentChecks, board: true },
      { code: "0002 DC OVERVOLT", name: "DC link overvoltage", causes: ["Deceleration too fast", "Supply overvoltage", "Brake chopper not working"], check: overvoltageChecks },
      { code: "0003 DEV OVERTEMP", name: "Drive overtemperature", causes: ["Fan failure", "Blocked heatsink", "High ambient temperature"], check: overheatChecks },
      { code: "0004 SHORT CIRC", name: "Short circuit", causes: ["Short circuit in the motor or cable", "Failed output IGBT"], check: ["Disconnect the motor; if the fault remains, the drive needs repair"], board: true },
      { code: "0006 DC UNDERVOLT", name: "DC link undervoltage", causes: ["Supply phase missing or low voltage", "Blown fuse"], check: undervoltageChecks, board: true },
      { code: "0009 MOT OVERTEMP", name: "Motor overtemperature", causes: ["Motor overloaded", "Poor motor cooling"], check: ["Check the load, motor fan and motor data"] },
      { code: "0016 EARTH FAULT", name: "Earth fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "0022 SUPPLY PHASE", name: "Supply phase loss / DC ripple", causes: ["Missing phase", "Aged DC capacitors"], check: undervoltageChecks, board: true },
    ],
  },
  {
    slug: "schneider",
    brand: "Schneider Electric",
    series: "Altivar ATV12, ATV312, ATV320, ATV610",
    intro: "Schneider Altivar drives show three-letter fault codes. These are the most common across the ATV12, ATV312 and ATV320.",
    codes: [
      { code: "OCF", name: "Overcurrent", causes: ["Acceleration too fast or heavy load", "Motor or cable fault", "Damaged power stage"], check: overcurrentChecks, board: true },
      { code: "SCF1 / SCF3", name: "Motor short circuit / ground short circuit", causes: ["Short circuit or earth fault on the output", "Failed IGBT"], check: groundFaultChecks, board: true },
      { code: "ObF", name: "DC bus overvoltage (overbraking)", causes: ["Deceleration too fast", "Regenerative load", "No braking resistor"], check: overvoltageChecks },
      { code: "USF", name: "Undervoltage", causes: ["Low supply voltage", "Faulty pre-charge"], check: undervoltageChecks, board: true },
      { code: "OHF", name: "Drive overheat", causes: ["Fan failure", "High ambient temperature"], check: overheatChecks },
      { code: "OLF", name: "Motor overload", causes: ["Motor overloaded", "Wrong thermal current setting"], check: ["Check the motor thermal current parameter and the load"] },
      { code: "PHF", name: "Input phase loss", causes: ["Missing supply phase", "Blown fuse"], check: undervoltageChecks },
      { code: "OPF1 / OPF2", name: "Output phase loss", causes: ["Broken motor cable", "Motor contactor open"], check: ["Check motor cable and contactor"] },
      { code: "INF", name: "Internal fault", causes: ["Control or power board fault"], check: ["Power off and on; repeating INF codes need board repair"], board: true },
    ],
  },
  {
    slug: "danfoss",
    brand: "Danfoss",
    series: "VLT Micro Drive FC 51, VLT HVAC FC 102, VLT AutomationDrive FC 302",
    intro: "Danfoss VLT drives show alarms as numbers. The most common alarms are listed below.",
    codes: [
      { code: "Alarm 13", name: "Overcurrent", causes: ["Shock load or fast acceleration", "Motor or cable fault", "Damaged power card"], check: overcurrentChecks, board: true },
      { code: "Alarm 16", name: "Short circuit", causes: ["Short circuit in the motor or cable", "Failed output stage"], check: ["Disconnect the motor; if the alarm remains, the power card needs repair"], board: true },
      { code: "Alarm 14", name: "Earth (ground) fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "Alarm 7", name: "DC overvoltage", causes: ["Deceleration too fast", "Supply overvoltage"], check: overvoltageChecks },
      { code: "Alarm 8", name: "DC undervoltage", causes: ["Supply loss or low voltage", "Faulty soft-charge circuit"], check: undervoltageChecks, board: true },
      { code: "Alarm 4", name: "Mains phase loss", causes: ["Missing phase or large imbalance"], check: undervoltageChecks },
      { code: "Alarm 9", name: "Inverter overloaded", causes: ["Load above the drive rating"], check: ["Reduce load or use a larger drive"] },
      { code: "Alarm 29", name: "Heatsink temperature", causes: ["Fan failure", "Blocked heatsink", "High ambient temperature"], check: overheatChecks },
    ],
  },
];

export function getDriveBrand(slug: string) {
  return DRIVE_BRANDS.find((b) => b.slug === slug);
}
