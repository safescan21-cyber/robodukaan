-- PCBDukaan sample catalog (industrial electronics). Run after schema.sql.
-- Safe to re-run: rows with the same slug/sku/code are updated, not duplicated.

-- Remove the earlier robotics/hobby sample catalog (only its sample slugs).
delete from public.products where sku like 'RD-%';
delete from public.categories where slug in
  ('development-boards','sensors','motors-drivers','drone-parts','batteries-power','displays','wireless','components','tools','diy-kits')
  and not exists (select 1 from public.products p where p.category_id = categories.id);

insert into public.categories (slug, name, description, icon, sort_order) values
  ('industrial-control-boards', 'Industrial Control Boards', 'Controller, timer, relay and interface boards for machines and panels.', 'pcb', 1),
  ('smps-power-supplies',       'SMPS & Power Supplies',     'DIN-rail and enclosed SMPS, DC-DC converters and power modules.',      'power', 2),
  ('vfd-motor-drives',          'VFD & Motor Drive Boards',  'Gate driver, BLDC, stepper and DC motor drive boards.',                'motor', 3),
  ('plc-io-modules',            'PLC & I/O Modules',         'Mini PLCs, digital and analog I/O, signal converters.',                'chip', 4),
  ('load-cells-weighing',       'Load Cells & Weighing',     'Load cells, weighing indicators, junction boxes and amplifiers.',      'scale', 5),
  ('industrial-sensors',        'Industrial Sensors',        'Proximity, photoelectric, RTD and thermocouple sensors.',              'sensor', 6),
  ('relays-power-components',   'Relays & Power Components', 'SSRs, IGBT modules, MOSFETs and high-voltage capacitors.',             'component', 7),
  ('displays-hmi',              'Displays & HMI',            'HMI touch panels, panel meters and LCD modules.',                      'display', 8),
  ('communication-modules',     'Communication Modules',     'RS485, Modbus, Ethernet and wireless modules for industrial links.',   'wifi', 9),
  ('test-repair-tools',         'Test & Repair Tools',       'Multimeters, rework stations, soldering and component testers.',       'wrench', 10)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description,
  icon = excluded.icon, sort_order = excluded.sort_order;

with p(slug, sku, name, brand, cat, short_description, description, price, mrp, stock, specs, featured, warranty) as (values
  -- Industrial control boards
  ('pid-temperature-controller-board', 'PD-IC-001', 'PID Temperature Controller 48×48 (Relay + SSR Output)', 'Generic', 'industrial-control-boards',
   'Dual-display PID controller for heaters, ovens and sealing machines.',
   'Universal input (K, J, PT100) PID controller with auto-tuning, relay and SSR outputs and an alarm relay. Panel cut-out 45 × 45 mm.',
   1450, 1999, 60, '{"Input":"K, J, E, PT100","Output":"Relay 3A + SSR drive","Supply":"90–260V AC","Size":"48 × 48 mm","Alarm":"1 relay"}', true, 12),
  ('timer-relay-board-24v', 'PD-IC-002', 'Industrial Timer Relay Board 24V DC (0.1 s – 999 h)', 'Generic', 'industrial-control-boards',
   'Programmable delay/cycle timer with 10A relay and LED display.',
   'Multi-mode timer board (on-delay, off-delay, cyclic) for conveyors, pumps and packaging machines. Opto-isolated trigger input.',
   549, 799, 120, '{"Supply":"24V DC","Relay":"10A 250V AC","Range":"0.1 s – 999 h","Modes":"18","Trigger":"Opto-isolated"}', false, 6),
  ('relay-board-4ch-24v', 'PD-IC-003', '4-Channel Relay Control Board 24V (Opto-isolated)', 'Generic', 'industrial-control-boards',
   'DIN-rail relay board for PLC and controller outputs.',
   'Four 10A relays with opto-isolated inputs, LED indication and screw terminals. Mounts on a 35 mm DIN rail.',
   699, 950, 150, '{"Channels":"4","Coil":"24V DC","Contacts":"10A 250V AC","Input":"Opto-isolated, NPN/PNP","Mounting":"DIN rail"}', true, 12),
  ('universal-inverter-control-card', 'PD-IC-004', 'Universal Inverter / UPS Control Card (SG3525)', 'Generic', 'industrial-control-boards',
   'Replacement control card for 12V/24V square-wave and modified-sine inverters.',
   'SG3525 based PWM control card with low-battery cut, overload sense and charging control. Common replacement for home and office inverters.',
   650, 899, 80, '{"Controller":"SG3525","Battery":"12V / 24V","Protection":"Low battery, overload, short circuit","Output":"Gate drive for MOSFET bank"}', false, 6),

  -- SMPS & power supplies
  ('smps-24v-5a-din', 'PD-PS-001', 'SMPS 24V 5A 120W DIN-Rail Power Supply', 'Generic', 'smps-power-supplies',
   'Slim DIN-rail SMPS for PLC panels and control cabinets.',
   'Universal AC input, adjustable output, short-circuit, overload and over-voltage protection.',
   1850, 2499, 70, '{"Output":"24V DC 5A (120W)","Input":"85–264V AC","Adjust":"±10%","Protection":"SCP, OLP, OVP","Mounting":"35 mm DIN rail"}', true, 24),
  ('smps-12v-10a-enclosed', 'PD-PS-002', 'SMPS 12V 10A 120W Enclosed Power Supply', 'Generic', 'smps-power-supplies',
   'Metal-cased SMPS for LED, CCTV and machine controls.',
   'Fan-less enclosed SMPS with screw terminals and output adjust pot.',
   899, 1299, 120, '{"Output":"12V DC 10A (120W)","Input":"100–240V AC","Efficiency":"> 85%","Cooling":"Convection"}', false, 12),
  ('smps-5v-20a', 'PD-PS-003', 'SMPS 5V 20A 100W Power Supply', 'Generic', 'smps-power-supplies',
   'High-current 5V supply for logic, displays and LED panels.',
   'Enclosed SMPS with overload and short-circuit protection.',
   950, 1350, 90, '{"Output":"5V DC 20A (100W)","Input":"100–240V AC","Protection":"SCP, OLP"}', false, 12),
  ('dc-dc-24v-to-12v-10a', 'PD-PS-004', 'DC-DC Converter 24V → 12V 10A (Waterproof)', 'Generic', 'smps-power-supplies',
   'Step-down converter for trucks, solar systems and 24V panels.',
   'Potted, waterproof buck converter with 95% efficiency.',
   749, 999, 100, '{"Input":"18–36V DC","Output":"12V DC 10A","Efficiency":"95%","Protection":"IP68 potted"}', false, 12),

  -- VFD & motor drives
  ('igbt-gate-driver-board-3ph', 'PD-VD-001', '3-Phase IGBT Gate Driver Board (up to 7.5 kW)', 'Generic', 'vfd-motor-drives',
   'Isolated 6-channel gate driver for VFD and inverter repairs.',
   'Six isolated gate drive channels with desaturation protection and fault output. Accepts 3.3V/5V PWM.',
   2450, 3200, 30, '{"Channels":"6 (3-phase bridge)","Isolation":"2500 Vrms","Gate drive":"+15 / −8 V","Protection":"DESAT, UVLO","Power":"Up to 7.5 kW"}', true, 6),
  ('bldc-driver-48v-500w', 'PD-VD-002', 'BLDC Motor Driver Board 24–48V 500W', 'Generic', 'vfd-motor-drives',
   'Hall-sensor BLDC driver with speed, brake and direction control.',
   'For conveyors, AGVs and pumps. 0–5V / PWM speed input, forward/reverse and brake.',
   1650, 2199, 45, '{"Voltage":"24–48V DC","Power":"500W","Feedback":"Hall sensors","Speed input":"0–5V / PWM"}', false, 6),
  ('stepper-driver-tb6600', 'PD-VD-003', 'Stepper Driver TB6600 4.5A (NEMA 17/23)', 'Generic', 'vfd-motor-drives',
   'Microstepping driver for CNC, packaging and positioning.',
   'Up to 1/32 microstepping, opto-isolated inputs, heat sink enclosure.',
   699, 950, 120, '{"Current":"0.5–4.5A","Voltage":"9–42V DC","Microstep":"Up to 1/32","Inputs":"Opto-isolated"}', false, 6),
  ('dc-motor-controller-40a', 'PD-VD-004', 'DC Motor Speed Controller PWM 10–50V 40A', 'Generic', 'vfd-motor-drives',
   'Heavy-duty PWM speed controller with panel potentiometer.',
   'Soft start, reverse-polarity protection and 40A continuous rating.',
   1199, 1599, 60, '{"Voltage":"10–50V DC","Current":"40A","Control":"Potentiometer / 0–5V"}', false, 6),

  -- PLC & I/O
  ('mini-plc-8di-6do', 'PD-PL-001', 'Mini PLC Board 8 DI / 6 Relay DO (RS232 programmable)', 'Generic', 'plc-io-modules',
   'Low-cost PLC board for small machines and automation upgrades.',
   'Ladder-programmable PLC board with 8 opto-isolated inputs, 6 relay outputs, 2 analog inputs and RS232/RS485.',
   3450, 4500, 35, '{"Digital in":"8 (24V, opto-isolated)","Outputs":"6 relay, 10A","Analog in":"2 × 0–10V","Comms":"RS232 + RS485","Supply":"24V DC"}', true, 12),
  ('digital-input-module-16ch', 'PD-PL-002', 'Digital Input Module 16-ch 24V (Opto-isolated)', 'Generic', 'plc-io-modules',
   'Expands controller inputs; NPN/PNP selectable.',
   'DIN-rail input module with LED per channel.',
   1250, 1650, 50, '{"Channels":"16","Input":"24V DC, NPN/PNP","Isolation":"Optocoupler"}', false, 12),
  ('signal-converter-4-20ma', 'PD-PL-003', '4–20 mA ↔ 0–10 V Signal Converter (Isolated)', 'Generic', 'plc-io-modules',
   'Isolated analog signal converter for sensors and drives.',
   'Selectable 4–20 mA / 0–10 V / 0–5 V in and out with 3-way isolation.',
   1350, 1799, 60, '{"Input":"4–20 mA / 0–10 V / 0–5 V","Output":"4–20 mA / 0–10 V","Isolation":"3-way","Supply":"24V DC"}', false, 12),

  -- Load cells & weighing
  ('s-type-load-cell-500kg', 'PD-LC-001', 'S-Type Load Cell 500 kg (Alloy Steel, IP67)', 'Generic', 'load-cells-weighing',
   'Tension/compression load cell for hoppers and hanging scales.',
   'Nickel-plated alloy steel S-beam with 2 mV/V output and 5 m shielded cable.',
   2850, 3600, 40, '{"Capacity":"500 kg","Output":"2.0 ± 0.1 mV/V","Accuracy":"C3","Protection":"IP67","Cable":"5 m, 4-wire"}', true, 12),
  ('single-point-load-cell-100kg', 'PD-LC-002', 'Single Point Load Cell 100 kg (Platform Scales)', 'Generic', 'load-cells-weighing',
   'Aluminium single-point cell for platform and checkweighers.',
   'For platforms up to 400 × 400 mm.',
   1450, 1950, 60, '{"Capacity":"100 kg","Platform":"400 × 400 mm","Output":"2.0 mV/V","Material":"Aluminium"}', false, 12),
  ('weighing-indicator-rs232', 'PD-LC-003', 'Weighing Indicator 6-Digit (RS232 + 4–20 mA)', 'Generic', 'load-cells-weighing',
   'Panel weighing indicator with set-points and serial output.',
   'Drives up to 8 load cells, 2 set-point relays, RS232 and analog output for PLCs.',
   4950, 6200, 25, '{"Display":"6-digit LED","Load cells":"Up to 8 × 350 Ω","Outputs":"2 relays, RS232, 4–20 mA","Supply":"230V AC"}', true, 12),
  ('load-cell-junction-box-4ch', 'PD-LC-004', 'Load Cell Junction Box 4-Channel (Trimming)', 'Generic', 'load-cells-weighing',
   'Summing box with corner trim pots for multi-cell scales.',
   'Die-cast IP65 box with cable glands.',
   1150, 1499, 50, '{"Channels":"4","Trimming":"Yes","Protection":"IP65"}', false, 12),

  -- Sensors
  ('inductive-proximity-m18', 'PD-SN-001', 'Inductive Proximity Sensor M18 NPN NO (8 mm)', 'Generic', 'industrial-sensors',
   'Flush-mount metal detection sensor for machines.',
   '3-wire NPN normally-open, 10–30V DC, 2 m cable.',
   349, 499, 300, '{"Size":"M18","Range":"8 mm","Output":"NPN NO","Supply":"10–30V DC","Protection":"IP67"}', false, 6),
  ('pt100-rtd-3wire', 'PD-SN-002', 'PT100 RTD Sensor 3-Wire with 2 m Cable', 'Generic', 'industrial-sensors',
   'Stainless probe for −50 to 250 °C process measurement.',
   '6 mm × 100 mm SS316 probe, Class B.',
   399, 549, 200, '{"Element":"PT100 Class B","Range":"−50 to 250 °C","Probe":"6 × 100 mm SS316","Wiring":"3-wire"}', false, 6),
  ('k-type-thermocouple-600c', 'PD-SN-003', 'K-Type Thermocouple Probe 0–600 °C', 'Generic', 'industrial-sensors',
   'Screw-mount thermocouple for ovens and moulding machines.',
   'M8 thread, fibreglass cable.',
   249, 349, 250, '{"Type":"K","Range":"0–600 °C","Mount":"M8 thread","Cable":"2 m fibreglass"}', false, 6),
  ('photoelectric-sensor-diffuse', 'PD-SN-004', 'Photoelectric Sensor Diffuse 30 cm NPN', 'Generic', 'industrial-sensors',
   'Object detection for conveyors and packaging lines.',
   'Adjustable sensitivity, LED indicator.',
   549, 749, 150, '{"Type":"Diffuse reflective","Range":"Up to 30 cm","Output":"NPN NO/NC","Supply":"10–30V DC"}', false, 6),

  -- Relays & power components
  ('ssr-40a-da', 'PD-PC-001', 'Solid State Relay 40A DA (3–32V DC Control)', 'Generic', 'relays-power-components',
   'Zero-cross SSR for heaters and resistive loads.',
   'Use with a heat sink above 10A.',
   449, 650, 200, '{"Load":"40A 24–380V AC","Control":"3–32V DC","Switching":"Zero-cross"}', false, 6),
  ('igbt-module-100a-1200v', 'PD-PC-002', 'IGBT Module 100A 1200V Half-Bridge', 'Generic', 'relays-power-components',
   'Common replacement module for VFDs, welders and UPS.',
   'Standard 62 mm package half-bridge module.',
   3250, 4200, 25, '{"Rating":"100A 1200V","Configuration":"Half bridge","Package":"62 mm"}', true, 3),
  ('mosfet-irfp460-pack5', 'PD-PC-003', 'MOSFET IRFP460 500V 20A (Pack of 5)', 'Generic', 'relays-power-components',
   'N-channel MOSFETs for inverter and SMPS repair.',
   'TO-247 package.',
   399, 599, 150, '{"Type":"N-channel","Rating":"500V 20A","Package":"TO-247","Quantity":"5"}', false, 0),
  ('capacitor-470uf-450v', 'PD-PC-004', 'Electrolytic Capacitor 470 µF 450V 105 °C', 'Generic', 'relays-power-components',
   'Snap-in DC-bus capacitor for drives and SMPS.',
   'Long-life 105 °C rated.',
   299, 399, 200, '{"Capacitance":"470 µF","Voltage":"450V","Temperature":"105 °C","Mount":"Snap-in"}', false, 0),

  -- Displays & HMI
  ('hmi-4-3-touch', 'PD-HM-001', '4.3" HMI Touch Display (RS232 / RS485, Modbus)', 'Generic', 'displays-hmi',
   'Colour touch panel for PLC and controller front-ends.',
   'Supports Modbus RTU master/slave, free configuration software.',
   6450, 7999, 20, '{"Screen":"4.3\" 480 × 272 colour touch","Comms":"RS232, RS485 (Modbus RTU)","Supply":"24V DC","Protection":"IP65 front"}', true, 12),
  ('panel-meter-dc-voltmeter-ammeter', 'PD-HM-002', 'DC Panel Meter 0–100V / 0–50A Volt-Ammeter', 'Generic', 'displays-hmi',
   'Dual display meter with shunt for battery and DC panels.',
   'Red/blue 0.28" display, 50A shunt included.',
   399, 549, 150, '{"Voltage":"0–100V DC","Current":"0–50A (shunt incl.)","Display":"Dual 0.28\""}', false, 6),

  -- Communication
  ('rs485-ttl-isolated', 'PD-CM-001', 'Isolated RS485 ↔ TTL Interface Board', 'Generic', 'communication-modules',
   'Galvanically isolated RS485 for Modbus links.',
   'Auto direction control, TVS protection.',
   549, 749, 120, '{"Interface":"RS485 ↔ 3.3/5V TTL","Isolation":"2500 Vrms","Protection":"TVS","Baud":"Up to 115200"}', false, 6),
  ('usb-rs485-converter', 'PD-CM-002', 'USB to RS485 Converter (FTDI, Industrial)', 'Generic', 'communication-modules',
   'Configure drives, meters and PLCs from a laptop.',
   'Metal case with screw terminals.',
   799, 1050, 100, '{"Chip":"FTDI","Interface":"USB ↔ RS485 2-wire","Protection":"ESD, over-current"}', false, 6),

  -- Test & repair tools
  ('multimeter-true-rms', 'PD-TL-001', 'Digital Multimeter True RMS 6000 Counts', 'Generic', 'test-repair-tools',
   'CAT III meter for panel and PCB troubleshooting.',
   'Measures AC/DC voltage and current, resistance, capacitance, frequency and temperature.',
   1650, 2199, 40, '{"Counts":"6000","Measurement":"True RMS","Safety":"CAT III 600V","Extras":"Capacitance, frequency, temperature"}', true, 12),
  ('hot-air-rework-station', 'PD-TL-002', 'Hot Air Rework Station 700W (SMD)', 'Generic', 'test-repair-tools',
   'Digital hot-air station for SMD and IC removal.',
   '100–480 °C, adjustable air flow, 3 nozzles.',
   3250, 4200, 25, '{"Power":"700W","Temperature":"100–480 °C","Nozzles":"3"}', false, 6),
  ('soldering-station-60w', 'PD-TL-003', 'Temperature-Controlled Soldering Station 60W', 'Generic', 'test-repair-tools',
   'ESD-safe station with digital display.',
   '200–480 °C with stand and sponge.',
   1999, 2599, 40, '{"Power":"60W","Temperature":"200–480 °C","ESD safe":"Yes"}', false, 12),
  ('component-tester-lcr', 'PD-TL-004', 'Component Tester (Transistor, ESR, LCR)', 'Generic', 'test-repair-tools',
   'Identifies and tests transistors, MOSFETs, capacitors and more.',
   'Graphic display, auto pin detection.',
   849, 1199, 60, '{"Tests":"BJT, MOSFET, diode, R, L, C, ESR","Display":"Graphic LCD"}', false, 6)
)
insert into public.products (slug, sku, name, brand, category_id, short_description, description,
                             price, mrp, stock, specs, is_featured, warranty_months)
select p.slug, p.sku, p.name, p.brand, c.id, p.short_description, p.description,
       p.price, p.mrp, p.stock, p.specs::jsonb, p.featured, p.warranty
from p join public.categories c on c.slug = p.cat
on conflict (slug) do update set
  sku = excluded.sku, name = excluded.name, brand = excluded.brand,
  category_id = excluded.category_id, short_description = excluded.short_description,
  description = excluded.description, price = excluded.price, mrp = excluded.mrp,
  stock = excluded.stock, specs = excluded.specs, is_featured = excluded.is_featured,
  warranty_months = excluded.warranty_months, updated_at = now();

-- Home page banners (edit in Admin → Home banners)
delete from public.banners where title in ('Build smarter robots', 'Drone season is here', 'Starter kits for students');
insert into public.banners (title, subtitle, cta_label, link, theme, sort_order)
select * from (values
  ('Industrial PCB repair', 'Send photos of your faulty board — inverter, SMPS, VFD, PLC — and get a free quote.', 'Get a repair quote', '/pcb-repair', 'dark', 1),
  ('Power supplies for every panel', 'DIN-rail and enclosed SMPS, DC-DC converters — dispatched in 24 hours.', 'Shop SMPS', '/category/smps-power-supplies', 'blue', 2),
  ('Weighing made simple', 'Load cells, indicators and junction boxes for industrial scales.', 'Shop weighing', '/category/load-cells-weighing', 'orange', 3)
) v(title, subtitle, cta_label, link, theme, sort_order)
where not exists (select 1 from public.banners b where b.title = v.title);

-- Sample coupons (edit in Admin → Coupons)
insert into public.coupons (code, description, discount_type, discount_value, max_discount, min_order) values
  ('WELCOME10', '10% off your first order (up to ₹500)', 'percent', 10, 500, 999),
  ('FLAT250',   '₹250 off orders above ₹4,999',          'flat',    250, null, 4999)
on conflict (code) do update set description = excluded.description, discount_type = excluded.discount_type,
  discount_value = excluded.discount_value, max_discount = excluded.max_discount, min_order = excluded.min_order;
update public.coupons set is_active = false where code = 'FLAT100';
