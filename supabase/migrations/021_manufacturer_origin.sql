-- PCBDukaan update 021: manufacturer / importer and country of origin on products
-- (Legal Metrology e-commerce rules: shown on the product page). Safe to run more than once.
alter table public.products add column if not exists manufacturer      text check (manufacturer is null or length(manufacturer) <= 300);
alter table public.products add column if not exists country_of_origin text check (country_of_origin is null or length(country_of_origin) <= 60);
