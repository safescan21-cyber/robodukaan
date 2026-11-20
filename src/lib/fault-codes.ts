// VFD / inverter and servo drive fault code library (English). Codes are the common ones shown on the keypad of
// each series; exact meanings differ between series and firmware, so pages tell readers to check
// the drive manual. `board` = this fault often points to a power/control board problem we repair.

export type FaultCode = {
  code: string;
  name: string;
  causes: string[];
  check: string[];
  board?: boolean;
  aliases?: string[]; // other ways the same code is shown or searched (e.g. "AL-014" for Danfoss Alarm 14)
};

export type DriveBrand = {
  slug: string;
  brand: string;
  series: string;
  kind?: "vfd" | "servo"; // default "vfd"
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
const encoderChecks = [
  "Check the encoder cable and connectors for damage, loose pins or oil/water",
  "Keep the encoder cable away from motor power cables and check its shield earthing",
  "Swap with a known-good cable or motor if possible; if the alarm stays, the drive's encoder interface may be faulty",
];
const servoOverloadChecks = [
  "Check for mechanical binding, a dragging brake or a jammed axis",
  "Compare the load with the motor/drive rating; reduce acceleration or duty cycle",
  "Check gain tuning – oscillation causes high current",
];
const positionErrorChecks = [
  "Check for mechanical jams, a stuck brake or a load that is too heavy",
  "Increase the position error limit or reduce speed/acceleration",
  "Check motor power wiring order (U, V, W) and the encoder cable",
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
      { code: "Alarm 13", aliases: ["A13", "AL-13", "AL-013", "Alarm 013"], name: "Overcurrent", causes: ["Shock load or fast acceleration", "Motor or cable fault", "Damaged power card"], check: overcurrentChecks, board: true },
      { code: "Alarm 16", aliases: ["A16", "AL-16", "AL-016", "Alarm 016"], name: "Short circuit", causes: ["Short circuit in the motor or cable", "Failed output stage"], check: ["Disconnect the motor; if the alarm remains, the power card needs repair"], board: true },
      { code: "Alarm 14", aliases: ["A14", "AL-14", "AL-014", "Alarm 014"], name: "Earth (ground) fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "Alarm 7", aliases: ["A7", "AL-7", "AL-007", "Alarm 007"], name: "DC overvoltage", causes: ["Deceleration too fast", "Supply overvoltage"], check: overvoltageChecks },
      { code: "Alarm 8", aliases: ["A8", "AL-8", "AL-008", "Alarm 008"], name: "DC undervoltage", causes: ["Supply loss or low voltage", "Faulty soft-charge circuit"], check: undervoltageChecks, board: true },
      { code: "Alarm 4", aliases: ["A4", "AL-4", "AL-004", "Alarm 004"], name: "Mains phase loss", causes: ["Missing phase or large imbalance"], check: undervoltageChecks },
      { code: "Alarm 9", aliases: ["A9", "AL-9", "AL-009", "Alarm 009"], name: "Inverter overloaded", causes: ["Load above the drive rating"], check: ["Reduce load or use a larger drive"] },
      { code: "Alarm 29", aliases: ["A29", "AL-29", "AL-029", "Alarm 029"], name: "Heatsink temperature", causes: ["Fan failure", "Blocked heatsink", "High ambient temperature"], check: overheatChecks },
    ],
  },
  {
    slug: "invt",
    brand: "INVT",
    series: "GD10, GD20, GD200A, CHF100A",
    intro: "INVT drives are widely used in Indian machines and panels. These are the fault codes you'll see most often on the GD and CHF series keypads.",
    codes: [
      { code: "OUt1 / OUt2 / OUt3", name: "Inverter unit (IGBT) protection – phase U / V / W", causes: ["Short circuit at the output or in the motor", "Damaged IGBT or gate driver", "Acceleration too fast"], check: overcurrentChecks, board: true, aliases: ["OUT1", "OUT2", "OUT3"] },
      { code: "OC1 / OC2 / OC3", name: "Overcurrent during acceleration / deceleration / constant speed", causes: ["Acceleration or deceleration time too short", "Short circuit or earth fault in the motor or cable", "Damaged current sensor or IGBT"], check: overcurrentChecks, board: true },
      { code: "OV1 / OV2 / OV3", name: "Overvoltage during acceleration / deceleration / constant speed", causes: ["Deceleration too fast (regenerated energy)", "High supply voltage", "Braking resistor missing or faulty"], check: overvoltageChecks },
      { code: "UV", name: "DC bus undervoltage", causes: ["Low or missing supply phase", "Weak DC bus capacitors", "Faulty pre-charge circuit"], check: undervoltageChecks, board: true },
      { code: "OL1", name: "Motor overload", causes: ["Motor load too high", "Wrong motor rated current parameter"], check: ["Check the load and the motor rated current setting", "Check the motor and machine for mechanical problems"] },
      { code: "OL2", name: "Inverter overload", causes: ["Load above the drive rating", "Acceleration too fast"], check: ["Reduce the load or acceleration", "Use a drive with a higher rating"] },
      { code: "SPI", name: "Input phase loss", causes: ["Missing supply phase", "Loose input terminals or blown fuse"], check: undervoltageChecks, board: true },
      { code: "SPO", name: "Output phase loss", causes: ["Broken motor cable or loose motor terminal", "Motor winding open", "Faulty output stage"], check: ["Check U, V, W cable and terminals", "Measure the motor winding resistance", "If wiring is fine, the output stage needs repair"], board: true },
      { code: "OH1 / OH2", name: "Rectifier / IGBT overheat", causes: ["Fan failure or blocked heatsink", "High panel temperature", "Faulty temperature sensor"], check: overheatChecks, board: true },
      { code: "ETH1 / ETH2", name: "Grounding (earth) short-circuit fault", causes: ["Motor or cable insulation failure", "Damaged output stage"], check: groundFaultChecks, board: true },
      { code: "EF", name: "External fault", causes: ["External fault input terminal activated"], check: ["Check the device wired to the external fault input", "Check the input terminal settings"] },
      { code: "CE", name: "RS485 communication error", causes: ["Wrong baud rate or address", "Broken or noisy communication cable"], check: ["Check communication parameters", "Check the cable, termination and earthing"] },
      { code: "ItE", name: "Current detection fault", causes: ["Faulty current sensor or its circuit", "Control board problem"], check: ["Power off and on; if it repeats, the current sensing circuit needs repair"], board: true },
      { code: "tE", name: "Motor autotuning fault", causes: ["Motor nameplate data entered wrongly", "Motor not connected or much smaller than the drive"], check: ["Check motor parameters and wiring, then autotune again"] },
      { code: "EEP", name: "EEPROM fault", causes: ["Memory error on the control board"], check: ["Reset to factory settings; if it repeats, the control board needs repair"], board: true },
    ],
  },
  {
    slug: "fuji",
    brand: "Fuji Electric",
    series: "FRENIC-Mini, FRENIC-Multi, FRENIC-Ace",
    intro: "Fuji FRENIC drives show alarm codes on the keypad. The most common ones are listed below.",
    codes: [
      { code: "OC1 / OC2 / OC3", name: "Overcurrent during acceleration / deceleration / constant speed", causes: ["Acceleration or deceleration too fast", "Short circuit or earth fault at the output", "Damaged IGBT"], check: overcurrentChecks, board: true },
      { code: "OV1 / OV2 / OV3", name: "Overvoltage during acceleration / deceleration / constant speed", causes: ["Deceleration too fast", "High supply voltage", "Braking resistor faulty or missing"], check: overvoltageChecks },
      { code: "LV", name: "Undervoltage", causes: ["Supply voltage dip or phase loss", "Weak DC bus capacitors", "Faulty charging circuit"], check: undervoltageChecks, board: true },
      { code: "Lin", name: "Input phase loss", causes: ["Missing or unbalanced supply phase"], check: undervoltageChecks },
      { code: "OPL", name: "Output phase loss", causes: ["Broken motor cable or winding", "Faulty output stage"], check: ["Check motor cable and terminals", "Measure the motor windings"], board: true },
      { code: "OH1", name: "Heatsink overheat", causes: ["Fan failure", "Blocked heatsink or high ambient temperature"], check: overheatChecks },
      { code: "OH2", name: "External alarm", causes: ["External alarm input (THR) activated"], check: ["Check the device wired to the external alarm input"] },
      { code: "OH4", name: "Motor protection (PTC thermistor)", causes: ["Motor overheated", "Thermistor wiring problem"], check: ["Check motor cooling and load", "Check the thermistor wiring"] },
      { code: "dbH", name: "Braking resistor overheat", causes: ["Braking duty too high", "Wrong resistor settings"], check: ["Increase deceleration time", "Check the braking resistor rating and settings"] },
      { code: "OL1", name: "Motor overload", causes: ["Motor overloaded", "Wrong electronic thermal setting"], check: ["Check load and the motor thermal parameters"] },
      { code: "OLU", name: "Inverter overload", causes: ["Load above the drive rating", "High carrier frequency or ambient temperature"], check: ["Reduce load, acceleration or carrier frequency"] },
      { code: "EF", name: "Ground (earth) fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true },
      { code: "Er1", name: "Memory error", causes: ["Data error in the drive memory"], check: ["Initialise parameters; if it repeats, the control board needs repair"], board: true },
      { code: "Er2", name: "Keypad communication error", causes: ["Loose or damaged keypad cable", "Faulty keypad"], check: ["Reseat or replace the keypad cable", "Try another keypad"] },
      { code: "Er3", name: "CPU error", causes: ["Electrical noise", "Control board fault"], check: ["Check earthing and noise sources", "Repeating Er3 needs control board repair"], board: true },
    ],
  },
  {
    slug: "hitachi",
    brand: "Hitachi",
    series: "WJ200, X200, SJ200, SJ700",
    intro: "Hitachi drives show trip codes from E01 upwards. These are the trips you'll see most often.",
    codes: [
      { code: "E01", name: "Overcurrent at constant speed", causes: ["Sudden load change", "Short circuit or earth fault at the output", "Damaged IGBT"], check: overcurrentChecks, board: true, aliases: ["E 01", "E1"] },
      { code: "E02", name: "Overcurrent during deceleration", causes: ["Deceleration too fast", "Output short circuit"], check: overcurrentChecks, board: true, aliases: ["E 02", "E2"] },
      { code: "E03", name: "Overcurrent during acceleration", causes: ["Acceleration too fast", "Heavy starting load", "Output short circuit"], check: overcurrentChecks, board: true, aliases: ["E 03", "E3"] },
      { code: "E04", name: "Overcurrent at stop / other times", causes: ["Output short circuit", "Damaged power stage or current sensor"], check: overcurrentChecks, board: true, aliases: ["E 04", "E4"] },
      { code: "E05", name: "Motor overload (electronic thermal)", causes: ["Motor overloaded", "Wrong thermal setting"], check: ["Check load and the electronic thermal level"], aliases: ["E 05", "E5"] },
      { code: "E06", name: "Braking resistor overload", causes: ["Braking duty too high"], check: ["Increase deceleration time", "Check braking resistor and usage ratio setting"], aliases: ["E 06", "E6"] },
      { code: "E07", name: "Overvoltage", causes: ["Deceleration too fast", "High supply voltage"], check: overvoltageChecks, aliases: ["E 07", "E7"] },
      { code: "E08", name: "EEPROM error", causes: ["Memory error", "Electrical noise"], check: ["Re-initialise; if it repeats, the control board needs repair"], board: true, aliases: ["E 08", "E8"] },
      { code: "E09", name: "Undervoltage", causes: ["Low supply voltage or phase loss", "Weak DC bus capacitors"], check: undervoltageChecks, board: true, aliases: ["E 09", "E9"] },
      { code: "E10", name: "Current detector (CT) error", causes: ["Faulty current sensor or its circuit"], check: ["Repeating E10 needs power/control board repair"], board: true },
      { code: "E11", name: "CPU error", causes: ["Control board fault", "Electrical noise"], check: ["Check earthing; repeating E11 needs control board repair"], board: true },
      { code: "E12", name: "External trip", causes: ["External trip input activated"], check: ["Check the device wired to the external trip input"] },
      { code: "E13", name: "USP error (unattended start protection)", causes: ["Run command was ON when power came on"], check: ["Switch off the run command before powering on, or change the USP setting"] },
      { code: "E14", name: "Ground (earth) fault", causes: ["Motor or cable insulation failure", "Damaged output stage"], check: groundFaultChecks, board: true },
      { code: "E15", name: "Input overvoltage", causes: ["Supply voltage too high for too long"], check: ["Measure the supply voltage"] },
      { code: "E16", name: "Instantaneous power failure", causes: ["Short supply interruption"], check: ["Check the supply, contactor and loose connections"] },
      { code: "E21", name: "Inverter overheat (thermal trip)", causes: ["Fan failure or blocked heatsink", "High ambient temperature"], check: overheatChecks },
      { code: "E30", name: "Driver error (IGBT protection)", causes: ["Output short circuit", "Damaged IGBT or gate driver"], check: overcurrentChecks, board: true },
    ],
  },
  {
    slug: "allen-bradley",
    brand: "Allen-Bradley PowerFlex",
    series: "PowerFlex 4, 4M, 40, 525",
    intro: "PowerFlex drives show faults as F followed by a number (F4 / F004). These are the most common faults on PowerFlex 4, 40 and 525 drives.",
    codes: [
      { code: "F004", name: "UnderVoltage", causes: ["Low supply voltage or missing phase", "Weak DC bus capacitors"], check: undervoltageChecks, board: true, aliases: ["F4", "F04", "F 004"] },
      { code: "F005", name: "OverVoltage", causes: ["Deceleration too fast", "High supply voltage"], check: overvoltageChecks, aliases: ["F5", "F05"] },
      { code: "F003", name: "Power loss", causes: ["DC bus voltage dropped too low"], check: undervoltageChecks, aliases: ["F3", "F03"] },
      { code: "F006", name: "Motor stalled", causes: ["Load too heavy for the acceleration setting"], check: ["Increase acceleration time", "Check the load"], aliases: ["F6", "F06"] },
      { code: "F007", name: "Motor overload", causes: ["Motor overloaded", "Wrong motor current parameter"], check: ["Check load and the motor nameplate parameters"], aliases: ["F7", "F07"] },
      { code: "F008", name: "Heatsink over-temperature", causes: ["Fan failure or blocked heatsink", "High ambient temperature"], check: overheatChecks, aliases: ["F8", "F08"] },
      { code: "F012", name: "Hardware overcurrent", causes: ["Output short circuit", "Acceleration too fast", "Damaged IGBT"], check: overcurrentChecks, board: true, aliases: ["F12"] },
      { code: "F013", name: "Ground fault", causes: ["Motor or cable insulation failure"], check: groundFaultChecks, board: true, aliases: ["F13"] },
      { code: "F038 / F039 / F040", name: "Phase U / V / W to ground", causes: ["Earth fault on one motor phase"], check: groundFaultChecks, board: true, aliases: ["F38", "F39", "F40"] },
      { code: "F041 / F042 / F043", name: "Phase-to-phase short (UV / UW / VW)", causes: ["Short between motor phases", "Damaged output stage"], check: overcurrentChecks, board: true, aliases: ["F41", "F42", "F43"] },
      { code: "F033", name: "Auto restart tries exceeded", causes: ["The drive tried to restart after a fault too many times"], check: ["Find and fix the original fault, then reset"], aliases: ["F33"] },
      { code: "F048", name: "Parameters defaulted", causes: ["Parameters were reset to factory defaults"], check: ["Set the parameters again"], aliases: ["F48"] },
      { code: "F063", name: "Software overcurrent", causes: ["Current above the software limit"], check: ["Check load and the current limit settings"], aliases: ["F63"] },
      { code: "F064", name: "Drive overload", causes: ["Load above the drive rating"], check: ["Reduce load or use a larger drive"], aliases: ["F64"] },
      { code: "F070", name: "Power unit", causes: ["Fault detected in the power section"], check: ["Repeating F070 needs power board repair"], board: true, aliases: ["F70"] },
      { code: "F081", name: "Communication loss", causes: ["Lost communication with the network or keypad"], check: ["Check the communication cable and settings"], aliases: ["F81"] },
      { code: "F100", name: "Parameter checksum error", causes: ["Memory data error"], check: ["Reset to defaults and set parameters again; if it repeats, control board repair"], board: true, aliases: ["F100"] },
      { code: "F122", name: "I/O board fail", causes: ["Fault on the I/O or control board"], check: ["Repeating F122 needs control board repair"], board: true, aliases: ["F122"] },
    ],
  },
  {
    slug: "delta-servo",
    brand: "Delta ASDA servo",
    kind: "servo",
    series: "ASDA-A2, ASDA-B2, ASDA-B3",
    intro: "Delta ASDA servo drives show alarms as ALnnn on the display. These are the alarms you'll see most often.",
    codes: [
      { code: "AL001", name: "Overcurrent", causes: ["Short circuit in motor or cable", "Wrong U, V, W wiring", "Damaged IGBT"], check: overcurrentChecks, board: true, aliases: ["AL-001", "AL01", "AL 001"] },
      { code: "AL002", name: "Overvoltage", causes: ["Deceleration too fast / high regenerated energy", "High supply voltage", "Regenerative resistor problem"], check: overvoltageChecks, aliases: ["AL-002", "AL02"] },
      { code: "AL003", name: "Undervoltage", causes: ["Low or missing supply", "Faulty power-on circuit"], check: undervoltageChecks, board: true, aliases: ["AL-003", "AL03"] },
      { code: "AL004", name: "Motor combination error", causes: ["Motor does not match the drive", "Encoder cable problem"], check: ["Check that the motor model suits the drive", "Check the encoder cable"], aliases: ["AL-004", "AL04"] },
      { code: "AL005", name: "Regeneration error", causes: ["Regenerative resistor missing, wrong or faulty", "Wrong regenerative resistor parameters"], check: ["Check the regenerative resistor wiring and value", "Check its parameter settings"], aliases: ["AL-005", "AL05"] },
      { code: "AL006", name: "Overload", causes: ["Load too heavy or mechanical binding", "Wrong gain tuning"], check: servoOverloadChecks, aliases: ["AL-006", "AL06"] },
      { code: "AL007", name: "Overspeed", causes: ["Speed command too high", "Gain too high / oscillation"], check: ["Check the speed command and electronic gear ratio", "Re-tune the gains"], aliases: ["AL-007", "AL07"] },
      { code: "AL008", name: "Abnormal pulse command", causes: ["Pulse input frequency too high", "Noise on the pulse lines"], check: ["Check controller pulse frequency", "Use shielded cable for pulse signals"], aliases: ["AL-008", "AL08"] },
      { code: "AL009", name: "Position error too large (excessive deviation)", causes: ["Mechanical jam or heavy load", "Error limit too small"], check: positionErrorChecks, aliases: ["AL-009", "AL09"] },
      { code: "AL011", name: "Encoder error", causes: ["Encoder cable damaged or loose", "Noise on the encoder signals", "Faulty encoder"], check: encoderChecks, board: true, aliases: ["AL-011", "AL11"] },
      { code: "AL013", name: "Emergency stop activated", causes: ["Emergency stop input is active"], check: ["Release the emergency stop and check its wiring and DI setting"], aliases: ["AL-013", "AL13"] },
      { code: "AL014", name: "Reverse (negative) limit switch error", causes: ["Reverse inhibit limit input active", "Limit switch wiring or setting"], check: ["Move the axis off the limit switch", "Check the limit switch, wiring and DI settings"], aliases: ["AL-014", "AL14", "AL 014"] },
      { code: "AL015", name: "Forward (positive) limit switch error", causes: ["Forward inhibit limit input active", "Limit switch wiring or setting"], check: ["Move the axis off the limit switch", "Check the limit switch, wiring and DI settings"], aliases: ["AL-015", "AL15"] },
      { code: "AL016", name: "IGBT overheat", causes: ["Continuous overload", "Short circuit at the output", "Poor cooling"], check: overheatChecks, board: true, aliases: ["AL-016", "AL16"] },
      { code: "AL017", name: "EEPROM error", causes: ["Memory error on the control board"], check: ["Reset parameters; if it repeats, the control board needs repair"], board: true, aliases: ["AL-017", "AL17"] },
      { code: "AL020", name: "Serial communication timeout", causes: ["Communication cable or settings problem"], check: ["Check the communication cable and parameters"], aliases: ["AL-020", "AL20"] },
      { code: "AL022", name: "Main circuit power phase loss", causes: ["Missing input phase"], check: undervoltageChecks, aliases: ["AL-022", "AL22"] },
    ],
  },
  {
    slug: "yaskawa-servo",
    brand: "Yaskawa Sigma servo",
    kind: "servo",
    series: "Sigma-5 (SGDV), Sigma-7 (SGD7S)",
    intro: "Yaskawa Sigma servo packs show alarms as A. followed by three characters. These are the alarms seen most often.",
    codes: [
      { code: "A.100", name: "Overcurrent or heat sink overheated", causes: ["Short circuit in motor or cable", "Damaged IGBT", "Poor cooling"], check: overcurrentChecks, board: true, aliases: ["A100", "A 100"] },
      { code: "A.020", name: "Parameter checksum error", causes: ["Memory data error"], check: ["Initialise parameters; if it repeats, the control board needs repair"], board: true, aliases: ["A020"] },
      { code: "A.300", name: "Regeneration error", causes: ["Regenerative resistor or transistor problem"], check: ["Check the regenerative resistor wiring and settings"], board: true, aliases: ["A300"] },
      { code: "A.320", name: "Regenerative overload", causes: ["Too much regenerated energy for the resistor"], check: ["Increase deceleration time or use a larger regenerative resistor"], aliases: ["A320"] },
      { code: "A.400", name: "Overvoltage", causes: ["Deceleration too fast", "High supply voltage"], check: overvoltageChecks, aliases: ["A400"] },
      { code: "A.410", name: "Undervoltage", causes: ["Low or missing supply"], check: undervoltageChecks, board: true, aliases: ["A410"] },
      { code: "A.510", name: "Overspeed", causes: ["Speed command too high", "Wrong wiring or gain"], check: ["Check the speed command, wiring order and gains"], aliases: ["A510"] },
      { code: "A.710 / A.720", name: "Overload (instantaneous / continuous)", causes: ["Mechanical binding or heavy load", "Brake not releasing"], check: servoOverloadChecks, aliases: ["A710", "A720"] },
      { code: "A.810", name: "Encoder backup error", causes: ["Encoder battery low or disconnected"], check: ["Replace the encoder battery and set up the absolute encoder again"], aliases: ["A810"] },
      { code: "A.C90", name: "Encoder communication error", causes: ["Encoder cable damaged or noisy", "Faulty encoder"], check: encoderChecks, board: true, aliases: ["AC90", "A.c90"] },
      { code: "A.d00", name: "Position error overflow", causes: ["Mechanical jam or heavy load", "Error limit too small"], check: positionErrorChecks, aliases: ["Ad00", "A.D00"] },
      { code: "A.F10", name: "Power line open phase", causes: ["Missing input phase"], check: undervoltageChecks, aliases: ["AF10"] },
    ],
  },
  {
    slug: "mitsubishi-servo",
    brand: "Mitsubishi MELSERVO",
    kind: "servo",
    series: "MR-J4, MR-J5, MR-JE",
    intro: "Mitsubishi MELSERVO amplifiers show alarms as AL. followed by a number. These are the most common alarms.",
    codes: [
      { code: "AL.10", name: "Undervoltage", causes: ["Low or missing supply", "Faulty power circuit"], check: undervoltageChecks, board: true, aliases: ["AL10", "AL 10"] },
      { code: "AL.12", name: "Memory error", causes: ["Control board memory fault"], check: ["Power off and on; if it repeats, the amplifier needs repair"], board: true, aliases: ["AL12"] },
      { code: "AL.16", name: "Encoder initial communication error", causes: ["Encoder cable not connected or damaged", "Faulty encoder"], check: encoderChecks, board: true, aliases: ["AL16"] },
      { code: "AL.20", name: "Encoder normal communication error", causes: ["Noise or damage on the encoder cable", "Faulty encoder"], check: encoderChecks, board: true, aliases: ["AL20"] },
      { code: "AL.30", name: "Regenerative error", causes: ["Regenerative resistor overloaded or faulty"], check: ["Increase deceleration time", "Check the regenerative option and settings"], aliases: ["AL30"] },
      { code: "AL.31", name: "Overspeed", causes: ["Speed command too high", "Wrong electronic gear setting"], check: ["Check the command and electronic gear ratio"], aliases: ["AL31"] },
      { code: "AL.32", name: "Overcurrent", causes: ["Short circuit in motor or cable", "Damaged power stage"], check: overcurrentChecks, board: true, aliases: ["AL32"] },
      { code: "AL.33", name: "Overvoltage", causes: ["Deceleration too fast", "Regenerative resistor problem"], check: overvoltageChecks, aliases: ["AL33"] },
      { code: "AL.35", name: "Command frequency error", causes: ["Pulse frequency too high", "Noise on the pulse lines"], check: ["Check the controller pulse frequency and shielding"], aliases: ["AL35"] },
      { code: "AL.37", name: "Parameter error", causes: ["Parameter outside the allowed range"], check: ["Check and correct the parameter settings"], aliases: ["AL37"] },
      { code: "AL.45", name: "Main circuit device overheat", causes: ["Poor cooling or continuous overload"], check: overheatChecks, board: true, aliases: ["AL45"] },
      { code: "AL.46", name: "Servo motor overheat", causes: ["Motor overloaded or poorly cooled"], check: servoOverloadChecks, aliases: ["AL46"] },
      { code: "AL.50 / AL.51", name: "Overload 1 / Overload 2", causes: ["Mechanical binding or heavy load", "Brake not releasing"], check: servoOverloadChecks, aliases: ["AL50", "AL51"] },
      { code: "AL.52", name: "Error excessive", causes: ["Mechanical jam or heavy load", "Gain too low"], check: positionErrorChecks, aliases: ["AL52"] },
      { code: "AL.E6", name: "Servo forced stop warning", causes: ["Forced stop (EM2/EM1) input is off"], check: ["Check the forced stop input and its wiring"], aliases: ["ALE6"] },
      { code: "AL.E9", name: "Main circuit off warning", causes: ["Servo-on with main circuit power off"], check: ["Switch on the main circuit power before servo-on"], aliases: ["ALE9"] },
    ],
  },
];

export function getDriveBrand(slug: string) {
  return DRIVE_BRANDS.find((b) => b.slug === slug);
}

// URL part for one code: "oc / ocA / ocd" → "oc", "Alarm 14" → "alarm-14", "A.C90" → "a-c90".
export function codeSlug(c: Pick<FaultCode, "code">) {
  return c.code.split(" / ")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getFaultCode(brandSlug: string, slug: string) {
  const brand = getDriveBrand(brandSlug);
  const code = brand?.codes.find((c) => codeSlug(c) === slug);
  return brand && code ? { brand, code } : null;
}

export const kindLabel = (b: Pick<DriveBrand, "kind">) => (b.kind === "servo" ? "servo drive" : "VFD / inverter");
