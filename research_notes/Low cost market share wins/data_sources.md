# Free and Low-Cost Data Sources and Legal Rules for Building a B2B Target-Customer Database (PCBDukaan, India)

Research method note: about 15 web searches and fetches, run on 2026-11-07. The fetch tool could not reach data.gov.in or udyamregistration.gov.in from this session (DNS blocked by the session's network allowlist). Where a field list or term comes from a third-party mirror or vendor rather than the official page, this is flagged. Prices are as published by vendors and should be re-checked.

## Q1. Government open data: Udyam, MCA, GST, ASI, factory lists, industrial estates, IEC, data.gov.in

### Takeaway
The most useful free government sources are the Udyam unit list on data.gov.in (names and locations of MSMEs by district, with NIC activity) and MCA company master data via OGD (CIN, name, registered office, NIC, capital, status). ASI microdata is anonymised, so it cannot give named leads. GST portal scraping is explicitly prohibited. State factory and industrial-estate lists are patchy and state-specific. RTI requests or CAG audit annexures are sometimes the only route.

### Cited Findings
**Udyam (MSME registration) on data.gov.in**
- data.gov.in hosts a resource "List of MSME Registered Units under UDYAM". It is described as district-wise MSME data since inception with LG Directory district code and a list of MSMEs. The listing indicates no ready API exists and users must click "Request API". — [data.gov.in resource](https://data.gov.in/resource/list-msme-registered-units-under-udyam)
- Separate district-wise aggregate count datasets exist: total, manufacturing and services enterprises under Udyam, updated daily. — [data.gov.in district-wise total](https://www.data.gov.in/resource/district-wise-total-msme-registered-enterprises-under-udyam-registration-till-last-date); [AIKOSH mirror, manufacturing](https://aikosh.indiaai.gov.in/home/datasets/details/district_wise_total_msme_registered_manufacturing_enterprises.html)
- The AIKOSH (IndiaAI) mirror lists these Udyam datasets under the Government Open Data License – India (GODL). — [AIKOSH Udyam list](https://aikosh.indiaai.gov.in/home/datasets/details/list_of_msme_registered_units_under_udyam.html)
- Older Udyog Aadhaar (pre-Udyam) state lists on data.gov.in, for example Delhi and Goa, offer API/CSV with a cap of 10,000 records per call. It was not confirmed whether the Udyam list has the same cap. — [UAM Delhi](https://www.data.gov.in/resource/list-msme-registered-units-under-udyog-aadhaar-memorandum-delhi); [UAM Goa](https://www.data.gov.in/resource/list-msme-registered-units-under-udyog-aadhaar-memorandum-goa)
- MSME Ministry metadata describes the Udyam data as "view only". — [Udyam_Metadata.pdf](https://www.udyamregistration.gov.in/docs/Udyam_Metadata.pdf) (from the search snippet; the PDF could not be fetched)

**MCA company master data**
- OGD "RoC-wise Company Master Data", as described by vendors that repackage it: CIN, legal name, registration date, status, ROC, state, authorised and paid-up capital, company class, and listed flag. Roughly 3.6 million companies. Directors, DIN, charges and AGM dates are not included. — [Apify nexgendata OGD actor](https://apify.com/nexgendata/ogd-india-companies-registry)
- A Dataful mirror of 2023–2025 MCA master data includes registered office address, NIC code and industrial classification. — [Dataful dataset 21566](https://dataful.in/datasets/21566)
- An older Kaggle compilation (1857–2020) includes an email field, but MCA emails are often outdated or belong to the auditor or CS office. — [Baselight/Kaggle](https://baselight.app/u/kaggle/dataset/rowhitswami_all_indian_companies_registration_data_1900_2019); [corpintel guide](https://corpintel.io/guides/how-to-read-mca-company-data)
- MCA has no public API (vendor claim). Third-party resellers charge from about US$0.02 per credit (CompanyData) or US$40 per 1,000 records (Apify actor). — [CompanyData MCA API](https://companydata.com/mca-api/); [Apify](https://apify.com/nexgendata/ogd-india-companies-registry)
- No official MCA bulk-data price was found.
- Free single-company search ("Master Data") on mca.gov.in is described in guides. — [Razorpay Rize guide](https://razorpay.com/rize/blogs/mca-master-data-company-search-roc-records-guide)

**GST taxpayer search**
- The GSTN website policy states "scrapping of GST site is strictly prohibited" and allows access only through GSTN-authorised interfaces. GSTN has also warned GSPs and ASPs that unauthorised scraping or bots breach GSTN's IP and the GSP agreement. — [Taxheal](https://taxheal.com/scrapping-of-gst-portal-site-is-strictly-prohibited-gstn.html); [SAG Infotech](https://blog.saginfotech.com/gstn-alerts-gsps-unauthorized-scraping-gst-portal); [Taxscan](https://www.taxscan.in/gst-portal-website-policy-scrapping/31359)
- There are reports of GST taxpayer contact details being sold on subscription. GSTN maintains that the data is secure, and the reports are unverified. — [JurisHour](https://www.jurishour.in/gst/your-gst-details-lakh-subscription)

**ASI unit-level data (MoSPI microdata)**
- ASI factory-level data are confidential under the Collection of Statistics Act and are for statistical use only. The microdata do not divulge unit location, and industries with fewer than 3 units are merged. — [microdata.gov.in ASI access policy](https://microdata.gov.in/nada43/index.php/catalog/7/accesspolicy)
- Older ASI rounds were listed as "chargeable". A 2025 Mint piece says MoSPI microdata is now free on registration. — [microdata.gov.in](https://microdata.gov.in/NADA43/index.php/catalog/18/accesspolicy); [Mint via Magzter](https://www.magzter.com/en/stories/newspaper/Mint-Hyderabad/THE-GOVERNMENT-MUST-REVIEW-ITS-PROPOSALS-ON-MICRODATA-ACCESS)

**State factory-licence lists**
- No national named list exists. DGFASLI publishes only the directory of Chief Inspectors of Factories and DISH offices (as of 05.06.2024). — [DGFASLI PDF](https://dgfasli.gov.in/public/Admin/Cms/AllPdf//667d45ce57e222.11029770.pdf)
- The Delhi Labour Department site links a "List of registered working factories". — [labour.delhi.gov.in sitemap](https://labour.delhi.gov.in/sitemap)
- Tamil Nadu DISH lists district registration offices. — [dish.tn.gov.in RTI](https://dish.tn.gov.in/rti.html)
- Assam publishes only counts, for example 7,225 factories. — [Assam annual report 2022](https://ciflabour.assam.gov.in/sites/default/files/swf_utility_folder/departments/iof_labour_uneecopscloud_com_oid_76/menu/document/annual_administrative_report_2022.pdf)

**Industrial estate allottee lists (MIDC example)**
- MIDC publishes a vacant-plots page, allotment guidelines and e-tender notices, but no consolidated allottee list was found. — [MIDC vacant plots](https://services.midcindia.org/Services/VacantPlotsDetails.aspx); [MIDC guidelines](https://www.midcindia.org/wp-content/uploads/2021/09/Guidelines-on-land-allotment.pdf)
- CAG 2023 audit annexures on MIDC list named allottees, plot area and industrial area (historical). — [CAG annexures](https://cag.gov.in/uploads/download_audit_report/2023/11-Annexures-06582bfb5aa2b95.86000893.pdf)

### Inferences
- **Best free starting set:** Udyam list (manufacturing, filtered by NIC for plastics, textiles, ceramics, food, packaging, auto components and similar) joined with MCA master data by name or address, then filtered to target industrial pincodes. These are the sectors most likely to run VFDs and PLCs. Expect firm-level identity, not contact persons.
- **How these sources can be reused:** The GODL licence generally permits reuse with attribution, but the GODL text itself was not fetched, so verify it.
- **Low-value or off-limits sources:** ASI is useful only for market sizing, such as factory counts by NIC and state. GST portal scraping should be avoided.
- **Slower routes for named lists:** For state factory lists and estate allottee lists, an RTI application to the state DISH office or industrial development corporation (MIDC, GIDC, SIPCOT and others) is a plausible low-cost route, but the outcome is unverified.

### Gaps
- Exact Udyam field list (whether name, address, mobile or email are published) and the download mechanism: official pages were not reachable from this session, so data.gov.in needs to be added to the allowlist.
- GIDC, SIPCOT, RIICO and KIADB allottee lists were not researched due to the tool-call budget.
- DGFT IEC data (whether public or bulk) was not researched.
- No official MCA bulk-purchase price was found.

## Q2. Commercial directories and databases (IndiaMART, TradeIndia, JustDial, Kompass, D&B, CMIE, Tofler, Zauba)

### Takeaway
Paid Indian company databases range from about Rs 3,000 per report (Tofler) to institutional subscriptions (CMIE Prowess, D&B), and current prices for most are not public. IndiaMART is actively locking data behind logins. Its seller API is limited to a seller's own catalogue, so scraping it carries contractual risk.

### Cited Findings
- **Tofler:** Company360 subscription at Rs 9,000 per quarter; single company report at Rs 2,999 (excluding tax). — [Tofler company page](https://www.tofler.in/kajaria-ceramics-limited/company/L26924HR1985PLC056150)
- **Zauba Corp:** No pricing found. The site gets about 85K monthly visits from branded searches (Ahrefs). — [Ahrefs](https://ahrefs.com/websites/zaubacorp.com)
- **CMIE Prowess:** Subscription-based. An academic variant, Prowessdx, exists. No current price was found; the only figure is from the 1990s. — [Wikipedia CMIE](https://en.wikipedia.org/wiki/Centre_for_Monitoring_Indian_Economy); [IIM Indore guide](https://iimidr.ac.in/wp-content/uploads/2025/10/User-Guide-CMIE-Prowessdx.pdf)
- **D&B India:** Covers 800K+ Indian companies per a competitor's marketing page. No price found. — [InfobelPRO](https://www.infobelpro.com/en/blog/b2b-data-providers-india)
- **Kompass India:** No reliable pricing source found.
- **IndiaMART:** Moved content behind logins to protect its data from Google and AI agents. — [Lapaas Voice](https://lapaasvoice.com/indiamart-moves-content-behind-logins-to-protect-its-data-from-google-search-and-ai-agents/)
- **IndiaMART Seller API:** Reported as restricted to registered suppliers for their own catalogue (third-party claim). — [Apify listing](https://apify.com/gtgyani206/indiamart-scraper)
- **Legal effect of website terms:** Under Indian law, accepted website terms form a contract, and scraping in breach of them gives a contractual claim independent of the IT Act. — [Lawrato](https://lawrato.com/indian-kanoon/civil-law/is-web-scraping-legal-in-india-what-a-business-can-and-cannot-collect-3192); [S.S. Rana](https://ssrana.in/articles/data-scraping-issues-india/)

### Inferences
- **Using IndiaMART legitimately:** Use it as a buyer or seller (paid seller plans receive buy-leads) rather than by scraping it.
- **Cheapest paid verification layer:** For a small firm, Tofler at Rs 9,000 per quarter is the cheapest found for checking target OEMs.

### Gaps
- IndiaMART, TradeIndia and JustDial terms-of-use text on scraping was not retrieved directly.
- No sources were found for Kompass pricing, current CMIE pricing, Tracxn, or association member directories (Plastics, Textile, Ceramic).

## Q3. Low-cost lead sharing and data partnerships

### Takeaway
No authoritative sources were found within the research budget. The guidance below is inference only.

### Cited Findings
- None found.

### Inferences
- **Partner lead-sharing:** Referral arrangements with independent technicians, drive and PLC distributors, and machine dealers are likely the cheapest high-intent channel.
- **Consent when passing leads:** Under the DPDP regime (see Q4), passing a named contact person's details to a partner would need consent or the contact's own request. Sharing company-level info, or the customer contacting the partner directly, is lower risk.
- **Association offers:** Member-discount offers through industrial associations avoid list-buying altogether.

### Gaps
- No case studies, typical referral-commission rates, or association offer terms were found.

## Q4. Legal rules: DPDP Act and Rules, TRAI UCC, WhatsApp policy, scraping

### Takeaway
The DPDP Rules were notified in November 2025 with a phased rollout, and full obligations run to about 13 May 2027. Business contact persons' personal data is likely in scope, which is inferred because no B2B carve-out was found. There is an exemption for data the person themselves made public, but it is contested and needs documented verification. Under TRAI's February 2025 amendment, telemarketing must use designated series (140 for promotional calls) with stiffer penalties. WhatsApp requires opt-in for marketing messages.

### Cited Findings
**DPDP Act and Rules**
- The DPDP Rules 2025 were notified on 13 or 14 November 2025 (sources differ) with a phased rollout over 12–18 months. Full compliance runs to about 13 May 2027. Consent Manager registration starts in November 2026. — [PIB document](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf); [Mondaq](https://www.mondaq.com/india/data-protection/1708434/operationalising-indias-data-protection-regime-analysing-the-newly-notified-dpdp-rules-2025); [AZB](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/)
- **Section 3(c)(ii) exemption:** Covers personal data made publicly available by the Data Principal or under a legal obligation. Law firms caution that indiscriminate scraping is not covered: the source must be verified and the basis documented. — [JSA](https://www.jsalaw.com/articles-publications/indias-digital-personal-data-protection-act-striking-a-balance-between-privacy-rights-and-public-data/); [India Briefing](https://www.india-briefing.com/news/india-dpdp-act-publicly-available-personal-data-46899.html/); [law.asia](https://law.asia/publicly-available-data-dpdpa/)

**TRAI telemarketing rules (TCCCPR)**
- The TCCCPR Second Amendment (12 February 2025) bars ordinary 10-digit numbers for telemarketing. The 140 series is for promotional calls and 1600 for transactional and service calls. The customer complaint window was extended from 3 to 7 days, and penalties were increased. — [TRAI PR 11/2025](https://cms.trai.gov.in/sites/default/files/2025-02/PR_No.11of2025.pdf); [JSA](https://www.jsalaw.com/wp-content/uploads/2025/02/JSA-Prism-Telecommunications_February-2025_TCCCPR-amendments.Final_.pdf)
- India TV reports UCC fines of Rs 2–10 lakh and says 1600 replaces 140. This conflicts with the TRAI press release, which should be preferred. — [India TV](https://www.indiatvnews.com/technology/news/trai-new-rules-promotional-calls-sms-to-have-standardised-identifiers-fines-increased-for-violations-2025-02-17-976560)
- Action is triggered against a sender after 5 complaints. — [Moneylife](https://moneylife.in/article/spam-calls-sms-regulations-tightened-by-trai-5-complaints-to-trigger-action-against-spammer/76368.html)

**WhatsApp Business**
- Opt-in is required before sending business-initiated or marketing messages, and the opt-in must state that it covers WhatsApp messages from the business. Since 2025, WhatsApp caps the number of marketing messages per user in India. These are vendor sources; Meta's own policy page was not fetched. — [CleverTap](https://clevertap.com/blog/navigating-whatsapps-new-marketing-message-limits-a-comprehensive-guide/); [Business Today](https://businesstoday.in/technology/news/story/whatsapp-sharpens-focus-on-business-chats-with-new-controls-and-broadcast-tools-470514-2025-04-03)

### Inferences
- **Cold outreach to company landlines or generic emails:** Lower risk than outreach to individuals' mobiles.
- **Bulk promotional calls or SMS:** Should go through a DLT-registered telemarketer or headers. Calls from a personal 10-digit number at scale risk disconnection.
- **Practical compliance:**
  - Record the source of each lead.
  - Offer opt-out.
  - Get explicit opt-in, for example a QR code or form at a shop or exhibition, before adding a contact to WhatsApp broadcasts.

### Gaps
- No specific DPDP guidance on B2B or professional contact data was found.
- The exact TCCCPR penalty schedule was not confirmed from the primary text.
- The text of Meta's WhatsApp Business Messaging Policy was not fetched.

## Q5. Practical cheap list-building (Google Maps, association directories) and risks

### Takeaway
Little primary evidence was found. Third-party scrapers exist for IndiaMART and MCA, but they shift legal risk (terms-of-use breach, and DPDP once in force) onto the user.

### Cited Findings
- Vendors sell IndiaMART and MCA scrapers that disclaim responsibility and put compliance with terms and law on the user. — [Apify IndiaMART suppliers scraper](https://apify.com/makework36/indiamart-suppliers-scraper); [Apify MCA director scraper](https://apify.com/factden/mca-company-director-scraper)
- A data-quality warning: MCA emails are often stale or belong to auditors. — [corpintel](https://corpintel.io/guides/how-to-read-mca-company-data)

### Inferences
- **Manual collection:** Manually collecting Google Maps listings for "industrial estate", "MIDC" and similar terms, then visiting or calling the business landline, is low-cost and lower-risk than automated scraping. Google Maps terms of service were not checked.

### Gaps
- Google Maps Platform terms on bulk extraction were not researched.
- No data was found on lead conversion rates from these sources.
