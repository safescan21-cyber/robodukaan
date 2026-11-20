-- PCBDukaan update 029: two new shop categories – IoT sensors & modules, and semiconductors.
-- Safe to run more than once (keeps any changes you make to them in Admin → Categories).
insert into public.categories (slug, name, description, icon, sort_order) values
  ('iot-sensors',    'IoT Sensors & Modules', 'Wireless and smart sensors, ESP32 / LoRa / GSM modules, gateways and data loggers for Industry 4.0.', 'iot', 11),
  ('semiconductors', 'Semiconductors & ICs',  'IGBTs, MOSFETs, diodes, thyristors, gate driver and power ICs, optocouplers and regulators.',       'chip', 12)
on conflict (slug) do nothing;
