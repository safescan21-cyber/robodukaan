# Target Industrial Clusters for PCBDukaan (Industrial PCB / VFD / PLC Repair + Spares): Tier-2/3 Indian Clusters with High Machine Density and Thin Local Repair Supply

Research notes, compiled Nov 2026. Method note: WebSearch only. IndiaMART directory pages (dir.indiamart.com) could not be fetched because that host is blocked in this session's network, so **systematic JustDial/IndiaMART listing counts per city were NOT collected**. This is the biggest gap (see Gaps under Q2). Where a number is my own estimate or inference, it is labelled **[EST]** or **[INF]**. Road distances are approximate figures from general geographic knowledge, not sourced, and are labelled [EST].

---

## Q1. Which MSME clusters have large machine bases? (Master table, 32 clusters)

### Takeaway
The largest machine bases by count are the textile weaving clusters: Surat (~6 lakh looms), Bhiwandi (~6 lakh operating), Ichalkaranji (~80k–1.2 lakh looms, about 21k of them shuttleless or auto). They are followed by Ludhiana (~85k registered industrial units), Panipat (20–30k units), Hosur (~2,000 auto units), Morbi (~1,200 ceramic plants), and the Adityapur, Waluj and Vapi estates (1,200–3,200 units each). Official unit counts are inconsistent across sources and years, so treat every number as order-of-magnitude.

### Master table

Legend: S = sourced (see Cited Findings for the URL), EST = estimate, INF = inference, NF = not found. "Typical automation" is an industry-norm inference [INF] unless stated otherwise. Distances to the nearest big repair hub (Mumbai/Pune, Ahmedabad/Vadodara, Delhi NCR, Chennai, Bengaluru) are approximate road km [EST].

| # | Cluster (town/district, state) | Main industries | Approx. units / machines | Typical automation [INF unless noted] | Local repair-supply evidence | Nearest big repair hub (road km, EST) |
|---|---|---|---|---|---|---|
| 1 | Morbi (Morbi dist.), Gujarat | Ceramic tiles/sanitaryware, wall clocks, laminates | ~1,200 ceramic units (2026 govt-linked coverage), up from ~820 (2022) and ~1,000 (2023) [S] | Kiln burners and fans on VFDs, hydraulic presses with PLC/HMI, glaze lines, digital inkjet printers, ball-mill drives, weighing/batching | Sacmi has a Morbi office serving 700+ customers [S]. Only 1 Morbi-based drive-repair firm surfaced in search (Prishiv Automation, IndiaMART) [S]. Rajkot providers are 65 km away [S] | Ahmedabad ~250 km; Rajkot (sub-hub) ~65 km |
| 2 | Rajkot, Gujarat | Machine tools, auto parts, pumps, bearings, castings | ~400 machine-tool units (2012–15), ~70% share of conventional machine tools [S] | CNC controllers (Fanuc/Siemens), servo drives, VFDs on pumps and motors | Has its own repair ecosystem: IndiaMART lists "Embicon Tech Hub, Rajkot" for VFD repair (15 yrs, 4.5★, 76 ratings) [S] | Ahmedabad ~215 km. Itself a sub-hub |
| 3 | Jamnagar, Gujarat | Brass parts | NF | CNC lathes, VMCs, traub machines | NF | Ahmedabad ~300 km |
| 4 | Surat (Sachin, Pandesara, Hojiwala), Gujarat | Synthetic weaving, processing, embroidery, diamonds | ~6,00,000 looms: 30,000 water-jet, 25,000 rapier, 3,000 air-jet (SGCCI, undated) [S] | Water-jet/rapier/air-jet looms carry servo, VFD and loom-controller PCBs; computerized embroidery machines | NF (large city, so some local supply likely [INF]) | Ahmedabad/Vadodara ~150–260 km; Mumbai ~280 km |
| 5 | Bhiwandi (Thane), Maharashtra | Powerloom weaving | Down from 12–14 lakh to ~6 lakh operating looms (2024–25) [S] | Mostly plain shuttle looms (low electronics). Some rapier | NF. Sector is in distress [S] | Mumbai ~30 km. **Poor fit** (close to hub, low-tech looms) |
| 6 | Ichalkaranji (Kolhapur dist.), Maharashtra | Powerloom and shuttleless weaving, processing | 15,000 air-jet + 3,000 rapier + 3,000 auto + 60,000 shuttle looms (F2F) [S]. Other sources say 1.2 lakh looms [S] | Air-jet/rapier looms (Picanol, Tsudakoma, Toyota) with servo drives, inverter and controller boards; sizing and warping VFDs | NF | Pune ~230 km |
| 7 | Malegaon (Nashik dist.), Maharashtra | Powerloom | NF | Mostly plain looms [INF] | NF | Mumbai ~280 km |
| 8 | Kolhapur (Shiroli/Gokul Shirgaon MIDC), Maharashtra | Foundry, auto components, sugar machinery | 250–300+ foundries, ~6 lakh t castings/yr [S] | Induction furnaces (power electronics), sand plants with PLCs, CNC machining | NF | Pune ~230 km |
| 9 | Aurangabad / Chh. Sambhajinagar (Waluj, Shendra, Chikalthana), Maharashtra | Auto (Bajaj and vendors), pharma, engineering | Waluj: ~3,249 allotted plots [S, garbled PDF]. Plus 1,300–1,400 units outside MIDC limits [S] | CNC, robots, PLCs, servos, press lines | NF | Pune ~235 km |
| 10 | Nashik (Satpur, Ambad, Sinnar), Maharashtra | Auto/electricals, engineering | NF | CNC, PLC, panels | NF | Mumbai ~170 km |
| 11 | Indore / Pithampur (Dhar), Madhya Pradesh | Auto, pharma, food, packaging | NF (no count found) | CNC, packaging PLCs, servo | NF | Ahmedabad ~400 km; Mumbai ~590 km |
| 12 | Raipur / Urla / Siltara (Raipur), Chhattisgarh | Sponge iron, steel rolling, ferro alloys, rice mills | Statewide: ~91 sponge-iron plants and 170+ rolling mills (BigMint, Dec 2024) [S]. A large share sits around Raipur [INF] | DC drives and large VFDs on rolling stands, PLCs, induction furnaces, weighbridges | NF | Nagpur ~290 km (not a listed hub); Mumbai ~1,100 km. **Far from all listed hubs** |
| 13 | Durgapur (Paschim Bardhaman), West Bengal | Steel, alloy, refractories, engineering | NF | Rolling DC drives, VFDs, PLCs | NF | Kolkata ~170 km (not a listed hub). >1,400 km from listed hubs |
| 14 | Jamshedpur / Adityapur (Seraikela-Kharsawan), Jharkhand | Auto components (Tata Motors vendors), steel ancillaries | 1,200+ units in Adityapur (JIADA). 1,400+ in AIADA command area (2024). ~800 in auto cluster [S] | CNC, presses, robots, VFDs, PLCs | NF | Kolkata ~280 km. >1,300 km from listed hubs |
| 15 | Hosur (Krishnagiri), Tamil Nadu | Auto (TVS, Ashok Leyland, vendors), electronics | 1,500+ industrial units and 3,000+ MSMEs (CREDAI TN). ~2,000 auto/non-auto units, ~1,400 micro [S] | CNC, servo, robots, PLCs | NF. Bengaluru (hub) is adjacent | Bengaluru ~40 km. **Poor fit** |
| 16 | Coimbatore, Tamil Nadu | Pumps, motors, foundry, textile machinery, spinning | ~600–620 foundries. ~600 pump makers "on paper", many defunct [S] | Spinning-mill VFDs, ring frames, CNC, induction furnaces | NF (large city with its own ecosystem [INF]) | Bengaluru ~365 km; Chennai ~500 km |
| 17 | Tiruppur, Tamil Nadu | Knitwear, dyeing/processing | NF (no count found) | Knitting machines, dyeing-machine controllers, compacters, VFDs, ETP pumps | NF | Bengaluru ~300 km |
| 18 | Erode / Karur, Tamil Nadu | Powerloom, home textiles, processing | NF | Shuttleless looms, VFDs | NF | Bengaluru ~280 km |
| 19 | Panipat, Haryana | Home textiles, blankets, recycled yarn, handloom | 20,000–30,000 units incl. ~6,000 registered factories (Tribune/ETV) [S]. Only 2,385 of ~30k registered (Tribune) [S] | Open-end spinning (recycling), VFDs, rapier looms | NF | Delhi ~90 km. Close to hub |
| 20 | Ludhiana, Punjab | Hosiery, cycle parts, auto parts, sewing machines, forging, machine tools | 85,196 industrial units (79,912 micro) per Industries Dept. Other claims run up to 1.5 lakh MSMEs [S]. Sewing-machine units down to ~1,800 [S] | CNC, knitting machines, induction heating, VFDs | NF | Delhi ~310 km |
| 21 | Jalandhar, Punjab | Hand tools, sports goods, valves/pipe fittings, leather | 200+ hand-tool units (BEE). Sports goods ~1,000–1,200 (older) [S] | Forging presses, induction heaters, CNC | NF | Delhi ~370 km |
| 22 | Batala / Amritsar, Punjab | Foundry, agri machinery, machine tools | NF | Induction furnaces, CNC | NF | Delhi ~450 km |
| 23 | Baddi-Barotiwala-Nalagarh (Solan), Himachal Pradesh | Pharma, FMCG | ~700+ units (commercial sites, weak). 537 industrial units in an older Business Standard count [S] | Tablet presses, blister packers, HVAC VFDs, PLC/SCADA, weighing/checkweighers | NF | Delhi NCR ~300 km |
| 24 | Haridwar (SIIDCUL) / Pantnagar (Udham Singh Nagar), Uttarakhand | FMCG, auto (Tata, Bajaj, Hero), pharma | NF | Packaging PLCs, servo, CNC | NF | Delhi ~220–250 km |
| 25 | Vapi / Daman / Silvassa, Gujarat & DNH-DD | Chemicals, dyes, pharma, plastics, textiles | Vapi ~1,300 (vendor blog) to 1,500+ (weak) [S] | Reactor agitator VFDs, PLC/DCS, extruders, filling lines | NF | Mumbai ~180 km; Vadodara ~230 km |
| 26 | Jaipur (VKI, Sitapura), Rajasthan | Bearings, engineering, gems, textile printing | NF | CNC, printing machines | NF | Delhi ~270 km |
| 27 | Bhilwara, Rajasthan | Synthetic yarn and fabric (spinning, weaving) | NF | Spinning-mill VFDs, rapier/air-jet looms | NF | Ahmedabad ~420 km; Delhi ~430 km |
| 28 | Kanpur (Panki, Dada Nagar), Uttar Pradesh | Leather, engineering, plastics, food | NF | Tannery drums, VFDs, CNC | NF | Delhi ~480 km |
| 29 | Faridabad, Haryana | Auto, engineering, tractors | NF | CNC, presses, robots | NF. Sits inside the NCR hub | Delhi ~30 km. **Poor fit** |
| 30 | Sri City (Tirupati), Andhra Pradesh | Large MNC plants: FMCG, electronics, rail | NF | Modern PLC/servo lines, OEM-serviced [INF] | NF | Chennai ~60 km. **Poor fit** |
| 31 | Visakhapatnam, Andhra Pradesh | Steel (RINL), pharma (Parawada), refining | NF | DC drives, VFDs, DCS | NF | Chennai ~800 km; Hyderabad ~620 km (not a listed hub) |
| 32 | Guwahati (Amingaon, Bamunimaidam), Assam | Plastics, food, cement, steel rolling (small), tea | NF | VFDs, packaging PLCs | NF | >1,000 km from Kolkata; >2,000 km from listed hubs |

### Cited Findings
- Morbi: about 1,200 ceramic units and ~60 lakh t/yr production. Gujarat govt ties the cluster to ~Rs 15,000 cr exports (2024-25) and says Morbi has up to 90% of India's ceramic exports — [The Week, Jan 2026](https://www.theweek.in/wire-updates/business/2026/01/06/morbi-leads-indias-ceramic-exports-with-up-to-90-pc-share-gujarat-govt.html); [IANS, Feb 2026](https://ianslive.in/gujarats-morbi-anchors-indias-rise-in-global-ceramics-market--20260216225918)
- Morbi: ~820 units in 2022 — [Business Standard](https://bsppd.business-standard.com/article/companies/gujarat-s-ceramic-tiles-hub-to-take-month-long-break-after-production-glut-122071400924_1.html). Headline says units "rise from 83 to over 670" as Gujarat secured gas supply during the West Asia crisis. This points to recent operational disruption: only a fraction of units was running at one point in 2026 — [Lokmat Times](https://www.lokmattimes.com/national/morbi-ceramic-units-rise-from-83-to-over-670-as-gujarat-secures-gas-supply-during-west-asia-crisis/amp/)
- Morbi laminate industry production down to 50% (Mar 2026) — [DeshGujarat](https://deshgujarat.com/2026/03/24/after-ceramic-sector-crisis-now-hits-morbi-laminate-industry-production-down-to-50/)
- Morbi older BEE study counted ~400 ceramic units (dated) — [BEE](https://beeindia.gov.in/sites/default/files/Morbi%20-%20Situation%20Analysis%20for%20SME%20Sector.pdf)
- Rajkot: about 400 machine-tool units, 90% small/medium, 70% share of India's conventional machine tools — [Business Standard (2015)](https://www.business-standard.com/article/markets/lack-of-demand-hits-rajkot-machine-tools-industry-115100200044_1.html); MSME DIPS Rajkot — [dcmsme.gov.in](https://www.dcmsme.gov.in/dips/DIPS%2C%20RAJKOT-guj.pdf)
- Surat: 6,00,000 looms, including 30,000 water-jet, 25,000 rapier and 3,000 air-jet (undated SGCCI page) — [SGCCI SITEX](https://sitex.sgcci.in/?p=386)
- Bhiwandi: operational powerlooms fell from 12 lakh to under 6 lakh after demonetisation and GST — [Vision IAS / Indian Express summary, Sep 2025](https://visionias.in/current-affairs/upsc-daily-news-summary/article/2025-09-09/the-indian-express/economy/final-nail-in-our-coffin-us-tariff-threat-looms-large-at-bhiwandi-powerloom-hub). Units near shutdown — [Free Press Journal](https://www.freepressjournal.in/mumbai/fpj-exclusive-bhiwandi-powerloom-crisis-deepens-as-yarn-prices-surge-demand-slumps-units-near-shutdown)
- Ichalkaranji: 15,000 air-jet, 3,000 rapier, 3,000 auto looms plus 60,000 shuttle powerlooms — [Fibre2Fashion](https://www.fibre2fashion.com/news/textile-news/bharat-tex-2025-ichalkaranji-aims-to-become-a-global-brand-300800-newsdetails.htm). Alternative count: 1.2 lakh powerlooms and 20,000 auto looms — [Indian Textile Journal](https://indiantextilejournal.com/?p=17151). 12,000 shuttleless looms in the mega cluster — [Textile Excellence](https://textileexcellence.com/single-news/3825/ichalkaranji-gets-its-first-processing-mega-cluster)
- Kolhapur: 300+ foundries and ~6 lakh t castings/yr (2025 decarbonisation pilot) — [Autocar Pro](https://www.autocarpro.in/news/kolhapur-foundries-launch-decarbonisation-initiative-to-reduce-emissions-by-30-128791). About 250 foundries across Kolhapur, Sangli, Ichalkaranji and Hatkanangale — [SIDBI cluster profile](https://development.sidbi.in/files/posts/Cluster-Profile-Report---Kolhapur-(Foundry)-Cluster.pdf). About 275 — [CSE](https://www.cseindia.org/improving-the-environmental-performance-of-the-foundry-sector-in-kolhapur-maharashtra-11761)
- Waluj MIDC: ~3,255 plots, ~3,249 allotted (PDF table garbled) — [MSME DIPS Aurangabad](https://dcmsme.gov.in/dips/DIPS%20-mu-Aurangabad.pdf). 1,300–1,400 units outside MIDC limits awaiting facilities — [Lokmat Times](https://www.lokmattimes.com/aurangabad/nearly-1400-companies-outside-waluj-midc-waiting-for-basic-facilities). 602 industries shut across 18 MIDCs (Aurangabad region) — [Lokmat Times](https://www.lokmattimes.com/aurangabad/602-industries-shut-across-18-midcs-thousands-lose-jobs)
- Chhattisgarh: ~91 sponge-iron plants (~14 mtpa) and 170+ operational rolling plants (~22 mtpa), Dec 2024 — [BigMint](https://bigmint.co/insights/detail/unveiling-chhattisgarhs-steel-industry-a-bigmint-report-611260)
- Adityapur: 1,200+ units — [JIADA](https://jiada.jharkhand.gov.in/adityapur). 1,400+ in AIADA command area (Sep 2024) — [Telegraph](https://obeta.ttef.in/jharkhand/electronics-manufacturing-cluster-in-adityapur-gets-impetus/cid/1841876). ~800 units in the Adityapur Auto Cluster (RAMP workshop) — [The Jharkhand Story](https://thejharkhandstory.co.in/adityapur-auto-cluster-pushes-for-greener-growth-under-ramp-initiative/)
- Hosur: 1,500+ industrial units and 3,000+ MSMEs — [DT Next (CREDAI TN)](https://www.dtnext.in/amp/story/news/business/credai-hails-tn-s-new-development-plan-for-hosur). ~2,000 auto/non-auto units, ~1,400 micro — [Autocar Pro](https://www.autocarpro.in/news-national/hosur-vendors-charge-destiny-1154)
- Coimbatore: ~620 foundries, mostly small — [i-scholar](https://i-scholar.in/index.php/jem/article/view/148003). ~600 motor-pump makers "on paper", many defunct, under pressure from Gujarat rivals — [Deccan Herald](https://www.deccanherald.com/amp/story/business%2Fcoimbatores-motor-pump-makers-deeply-challenged-by-gujarat-peers-3685168). Older BEE count ~410 — [BEE](https://beeindia.gov.in/sites/default/files/Coimbatore_0.pdf)
- Panipat: 25,000–30,000 handloom and textile units — [ETV Bharat, 2022](https://etvbharat.com/english/bharat/400-textile-industries-in-panipat-to-be-closed-from-oct-1/na20221001080237683683647). Only 2,385 of ~30k units registered — [Tribune](https://www.tribuneindia.com/news/haryana/only-2-385-of-30k-units-registered-in-panipat-312268). ~20,000 units incl. 6,000 registered factories — [Tribune](https://www.tribuneindia.com/news/welcome-to-panipat-%E2%80%94-haryanas-textile-hub-48747)
- Ludhiana: 85,196 industrial units (79,912 micro, 4,827 small, 457 medium, 80 large) per Industries Dept — [Tribune](https://www.tribuneindia.com/news/ludhiana/industrial-investment-dips-to-five-year-low-in-ludhiana-district-522585). Sewing-machine units down to ~1,800 from 3,000+ — [KNN](https://knnindia.co.in/news/newsdetails/msme/medium/ludhianas-3000-sewing-machine-mfg-msme-units-face-technological-obsolescence)
- Jalandhar: 200+ hand-tool units — [BEE SIDHIEE](https://sidhiee.beeindia.gov.in/AboutUs/handtools). Sports goods industry decline — [YourStory, Aug 2026](https://yourstory.com/2026/08/jalandhar-sports-goods-industry)
- Baddi: 537 functioning industrial units, 117 medium/large (older) — [Business Standard](https://www.business-standard.com/article/economy-policy/hp-industrial-clusters-on-fast-growth-track-106083101053_1.html). ~700+ BBN units is a commercial-site claim (weak) — [Laafon](https://laafon.com/pharma-units-for-sale-in-baddi/). Baddi has a first drug-testing lab (Rs 32 cr) — [Medical Dialogues](https://medicaldialogues.in/news/industry/pharma/in-a-first-rs-32-crore-drug-testing-lab-to-boost-quality-control-in-baddi-himachal-141229)
- Vapi: ~1,300 chemical, pharma and dye units (vendor blog, not independent) — [Heaven Green Energy](https://www.heavengreenenergy.com/blog/solar-for-vapi-chemical-cluster). 1,500+ (citation-needed wiki mirror) — [Wikipedia 2006 mirror](https://wikipedia2006.classicistranieri.com/en/v/a/p/Vapi.html)

### Inferences
- Electronics density per unit matters more than unit count for PCBDukaan. Air-jet/rapier/water-jet looms (Ichalkaranji, Surat, Bhilwara), ceramic kilns and presses (Morbi), rolling mills (Raipur, Durgapur), pharma packaging (Baddi), and CNC/auto vendor bases (Adityapur, Waluj, Hosur) are board-heavy. Plain shuttle looms (Bhiwandi, Malegaon, much of Panipat) are not. [INF]
- Several clusters are in distress (Bhiwandi, Morbi gas disruption 2026, Coimbatore pumps, Jalandhar sports goods). Distressed units tend to repair rather than replace, which can favour a low-cost repair offer, but they are also price-sensitive and slow payers. [INF]

### Gaps
- No official 2024-25 unit counts found for Pithampur, Nashik, Tiruppur, Erode, Jamnagar, Jaipur, Kanpur, Durgapur, Haridwar/Pantnagar, Sri City, Visakhapatnam, Guwahati, Bhilwara, Batala, Malegaon. Searches returned nothing usable, so these cells are NF.
- MSE-CDP cluster lists, ASI 2023-24 state tables and Udyam district counts were not retrieved (not reached within the tool budget).
- Typical-automation column is industry-norm inference, not survey data.

---

## Q2. Where do factories get drive/PLC repairs today? Evidence of thin local supply

### Takeaway
Evidence is sparse. In Morbi, OEM service (Sacmi, 700+ customers) and only one Morbi-addressed drive-repair firm surfaced in search; Rajkot (65 km away) has established VFD-repair vendors. For most other clusters, no direct evidence (listing counts, association statements) was found. **The "thin supply" hypothesis is unverified and needs a manual JustDial/IndiaMART count.**

### Cited Findings
- Morbi: Prishiv Automation is listed in Morbi offering Delta VFD repair, AC/DC drives, Mitsubishi VFD and control panels. It was the only Morbi-based drive-repair listing in search results — [IndiaMART: Prishiv Automation](https://m.indiamart.com/prishiv-automation/profile.html)
- Rajkot: IndiaMART "VFD repair Rajkot" directory shows Embicon Tech Hub (TrustSEAL, 15 yrs, 4.5★ from 76 ratings, 83% response rate) — [IndiaMART Rajkot VFD repair](https://dir.indiamart.com/rajkot/vfd-repair.html) (seen in search snippet only; page fetch blocked)
- IndiaMART has city directory pages for VFD repair (e.g., Nagpur) — [IndiaMART Nagpur](https://dir.indiamart.com/nagpur/vfd-repair.html). A Vadodara VFD repair listing exists on TradeIndia — [TradeIndia](https://abcmedia.tradeindia.com/vfd-drive-repair-services-9301282.html)
- IndMALL runs multi-brand VFD repair pages (national, not Morbi-specific) — [IndMALL](https://www.indmall.in/?p=95116)
- Sacmi's Morbi office serves 700+ ceramic customers with faster remote and on-site service, and local rupee spares — [Sacmi India](https://sacmi-in.sacmi.com/en-US)
- Rajkot engineers are preparing domestically built machines for Morbi factories, reducing reliance on EU imports — [ThePrint](https://theprint.in/ground-reports/morbi-is-indias-undisputed-tile-champion-now-this-gujarat-town-is-eyeing-chinas-crown/1891568)
- Chinese-origin ceramic-machine spares (gear reducers, seals) appear in import records — [Seair](https://www.seair.co.in/import-data-hs-code-84669100/country-china/april.aspx)

### Inferences
- Morbi's OEM support (Sacmi, System Ceramics) covers mechanical and process equipment. Third-party electronics (generic Chinese/Taiwanese VFDs, servo drives, inkjet-printer boards) are likely served by a handful of local panel shops plus Rajkot. That pattern suggests a gap for fast, priced, board-level repair. [INF, unverified]
- Clusters 200+ km from any metro with mixed Chinese/Japanese/European loom or kiln electronics fit the "thin supply" profile best: Ichalkaranji, Raipur, Adityapur, Ludhiana/Jalandhar, Baddi, Bhilwara. Hosur, Faridabad, Sri City, Bhiwandi and Panipat sit next to hubs with established repair shops. [INF]

### Gaps
- **No JustDial or IndiaMART listing counts were obtained.** dir.indiamart.com is blocked in this session (network allowlist), and JustDial was not reachable via search. Suggested manual check: count listings for "VFD repair", "servo drive repair" and "PLC repair" in each of the 32 towns.
- No association statements (e.g., Morbi Ceramic Association, Ichalkaranji Powerloom associations, Urla Industries Association) on repair-service shortages were found.
- No news reporting machine downtime caused by lack of repair services was found.

---

## Q3. Courier / reverse-pickup reach

### Takeaway
Delhivery covers roughly 18,500–18,800 pin codes (2,500+ towns) and offers reverse pickup. Blue Dart claims far wider pin-code reach but is a premium service. Every cluster town in the table is a district HQ or major industrial estate and is very likely serviceable [INF]. Pin-level verification per estate was not done.

### Cited Findings
- Delhivery: ~18,500–18,850 pin codes and 2,500+ cities/towns. Reverse logistics is a listed service. Reported as the largest reverse-pickup provider by volume (vendor claim) — [Shipway](https://blog.shipway.com/delhivery-vs-blue-dart-vs-dtdc/); [ClickPost](https://clickpost.ai/courier-service-companies-in-india); [Shipmozo](https://www.shipmozo.com/blog/top-courier-partners-for-reverse-logistics)
- Blue Dart pin-code figures conflict (17,000 to 56,400). Its reverse pickup is premium, reportedly 30–50% above competitors — [Shipmozo](https://www.shipmozo.com/blog/top-courier-partners-for-reverse-logistics); [iThink Logistics](https://ithinklogistics.com/blog/top-10-courier-companies-in-india)
- Delhivery acquired Ecom Express (2025), expanding reach — [Commmerce](https://commmerce.com/blog/shipping-integration-apis-indian-retailers-delhivery-vs-bluedart-setup-guide-2026/)

### Inferences
- For heavy items (large VFDs and DC drive power stacks over 10–20 kg), Delhivery B2B/part-truckload or local transport is likely needed. Express reverse pickup suits PCBs, small drives and HMIs. [INF]
- Remote estates (Siltara/Urla in Raipur, Gokul Shirgaon, Barotiwala, Amingaon) should be pin-checked on the Delhivery/Blue Dart tools before launch. [INF]

### Gaps
- No pin-code-level reverse-pickup serviceability check was done per cluster. Official carrier pin lists were not fetched.

---

## Q4. Best 5–10 clusters for low-cost entry, and why

### Takeaway
Ranked shortlist [INF, built on the sourced data above]:
1. Morbi
2. Ichalkaranji (+ Kolhapur foundries)
3. Raipur steel belt
4. Adityapur/Jamshedpur
5. Ludhiana + Jalandhar (Punjab bundle)
6. Baddi-Nalagarh
7. Surat weaving (Sachin/Hojiwala/Pandesara)
8. Coimbatore–Tiruppur–Erode (TN textile/pump belt)

These combine a large, electronics-dense machine base, 200+ km to a big repair hub, and courier reach. Bhiwandi, Faridabad, Hosur, Sri City and Panipat look weak (hub-adjacent and/or low-electronics machines).

### Cited Findings (supporting each pick)
1. **Morbi:** ~1,200 kiln- and press-intensive plants — [The Week](https://www.theweek.in/wire-updates/business/2026/01/06/morbi-leads-indias-ceramic-exports-with-up-to-90-pc-share-gujarat-govt.html). Only one Morbi drive-repair listing surfaced — [IndiaMART](https://m.indiamart.com/prishiv-automation/profile.html). Risk: 2026 gas-supply disruption (units fell to 83 running before recovering to 670+) — [Lokmat Times](https://www.lokmattimes.com/national/morbi-ceramic-units-rise-from-83-to-over-670-as-gujarat-secures-gas-supply-during-west-asia-crisis/amp/)
2. **Ichalkaranji + Kolhapur:** ~21k shuttleless/auto looms — [Fibre2Fashion](https://www.fibre2fashion.com/news/textile-news/bharat-tex-2025-ichalkaranji-aims-to-become-a-global-brand-300800-newsdetails.htm). Plus 300+ foundries with induction furnaces — [Autocar Pro](https://www.autocarpro.in/news/kolhapur-foundries-launch-decarbonisation-initiative-to-reduce-emissions-by-30-128791)
3. **Raipur belt:** 170+ rolling mills and ~91 DRI plants statewide — [BigMint](https://bigmint.co/insights/detail/unveiling-chhattisgarhs-steel-industry-a-bigmint-report-611260)
4. **Adityapur:** 1,200–1,400+ units, ~800 in the auto cluster — [JIADA](https://jiada.jharkhand.gov.in/adityapur); [Telegraph](https://obeta.ttef.in/jharkhand/electronics-manufacturing-cluster-in-adityapur-gets-impetus/cid/1841876)
5. **Ludhiana/Jalandhar:** 85k+ units — [Tribune](https://www.tribuneindia.com/news/ludhiana/industrial-investment-dips-to-five-year-low-in-ludhiana-district-522585). 200+ hand-tool units — [BEE](https://sidhiee.beeindia.gov.in/AboutUs/handtools)
6. **Baddi:** 537 to ~700 units (weak sourcing) — [Business Standard](https://www.business-standard.com/article/economy-policy/hp-industrial-clusters-on-fast-growth-track-106083101053_1.html)
7. **Surat:** 30k water-jet, 25k rapier and 3k air-jet looms — [SGCCI](https://sitex.sgcci.in/?p=386). Powerloom stress from labour exodus and rising costs — [Vibes of India](https://www.vibesofindia.com/?p=376912)
8. **Coimbatore:** ~600 foundries and pump makers under cost pressure — [Deccan Herald](https://www.deccanherald.com/amp/story/business%2Fcoimbatores-motor-pump-makers-deeply-challenged-by-gujarat-peers-3685168)

### Inferences (why these rank)
- **Morbi is #1:** very high VFD and PLC count per plant (kilns, presses, dryers, polishing lines), continuous-process downtime cost, a single-industry cluster that is easy to target via one association and WhatsApp groups, and Gujarati-language content can reach it cheaply. Rajkot competition 65 km away is the main threat, so the edge would be speed (pickup → turnaround → spares stock) and price transparency.
- **Ichalkaranji is #2:** air-jet and rapier loom electronics (servo boards, inverter cards) are expensive OEM spares. Pune is ~230 km away. Board-level repair and refurbished-spares economics look strong.
- **Raipur and Adityapur:** far from all five named hubs (>1,000 km). Heavy DC/AC drives in rolling mills are high-ticket repairs. Higher logistics cost per item is offset by ticket size.
- **Punjab and Baddi:** 300+ km from Delhi with a big MSME base. Baddi pharma has GMP uptime pressure, which supports a premium for fast turnaround.
- **Avoid initially:** Hosur (Bengaluru 40 km), Faridabad (inside NCR), Sri City (Chennai 60 km, MNC OEM contracts), Bhiwandi (Mumbai 30 km, plain looms, distressed), Panipat (Delhi 90 km, many low-tech looms).
- All rankings are hypotheses. The decisive check is a per-town count of local VFD/PLC repair listings, which was not done.

### Gaps
- Competitive density (listing counts), local pricing and turnaround benchmarks per cluster are unknown.
- Unit counts for Tiruppur, Pithampur, Bhilwara and Durgapur were not found, so these could not be ranked with confidence.
- No sourced data on installed VFD/PLC populations per cluster (e.g., drive-OEM regional sales). Machine mix is inferred.
