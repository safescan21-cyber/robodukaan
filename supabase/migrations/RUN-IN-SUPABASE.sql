-- PCBDukaan update 026: frequent customer questions for the AI assistant (Admin → AI assistant).
-- Answers use only facts from the website; edit or switch them off in the admin. Added once; safe to re-run
-- (a question that already exists, or that you deleted, is not added again).
create table if not exists private.seeded_faq (question text primary key);
insert into public.ai_knowledge (question, answer, keywords)
select v.question, v.answer, v.keywords
from (values
  ($q$Are your products original / genuine?$q$, $q$Every product page shows the brand, part number and specifications, and parts are tested before dispatch. The warranty for each product is shown on its page. If you need a specific make or model, tell us the part number and we'll confirm before you order.$q$, $q$original, genuine, asli, duplicate, fake, branded, real, quality$q$),
  ($q$Do you deliver all over India?$q$, $q$Yes – we ship across India by courier, with cash on delivery available. Delivery usually takes 2–7 working days depending on your PIN code; you can check your PIN on the product page.$q$, $q$all india, deliver, pincode, city, village, location, kahan tak, sab jagah$q$),
  ($q$Is there an extra charge for cash on delivery?$q$, $q$No extra COD charge is added. Shipping is free on orders of ₹499 or more and ₹49 below that; 18% GST is added at checkout.$q$, $q$cod charge, cod fee, extra charge, cash on delivery charge, cod lagega$q$),
  ($q$Can you dispatch today / urgently?$q$, $q$Items marked “Ready to dispatch” ship within 24 hours on working days. For something urgent, order it today and email us your order number so we can prioritise it.$q$, $q$urgent, today, same day, fast, jaldi, aaj, emergency, breakdown$q$),
  ($q$Is there a minimum order?$q$, $q$There is no minimum order. Orders of ₹499 or more ship free; below that shipping is ₹49.$q$, $q$minimum order, moq, small order, one piece, ek piece$q$),
  ($q$Do prices include GST?$q$, $q$Prices on the site are without GST; 18% GST is added at checkout and shown on your GST invoice.$q$, $q$including gst, with gst, gst extra, inclusive, price gst$q$),
  ($q$Do you ship outside India?$q$, $q$We currently deliver within India. For orders from other countries, email us with the part numbers and your address and we'll check.$q$, $q$international, outside india, abroad, export, other country, dubai, nepal, bangladesh$q$),
  ($q$How do I find a replacement or equivalent part?$q$, $q$Use the Replacement finder on /replacement-finder or search the old part number in the search box – product pages list the part numbers they replace. If you still can't find it, send the part number on /bulk-quote and we'll source it.$q$, $q$replacement, equivalent, alternative, compatible, substitute, same as, old part, discontinued$q$),
  ($q$Where can I get the datasheet or manual?$q$, $q$Datasheets, manuals and wiring diagrams are on the product page under Documents when available. If one is missing, email us the product name and we'll send what we have.$q$, $q$datasheet, manual, wiring, diagram, pdf, specification, connection$q$),
  ($q$Can my company buy on credit or with a purchase order?$q$, $q$Orders are paid by cash on delivery or online at checkout. For company purchases, bulk quantities or a formal quotation, request a quote on /bulk-quote and we'll reply with prices and terms.$q$, $q$credit, purchase order, po, company purchase, net 30, quotation, proforma$q$),
  ($q$Can I change my address or order after placing it?$q$, $q$You can cancel from My account → My orders until the order is packed and place a new one. For an address change, email us your order number as soon as possible.$q$, $q$change address, wrong address, edit order, modify order, address badalna$q$),
  ($q$I forgot my order number. How do I track my order?$q$, $q$Your order number is in the order confirmation email and in My account → My orders. Track any order on /track with the order number and your mobile number.$q$, $q$order number, forgot order, lost order, where is my order, mera order$q$),
  ($q$Payment failed but money was deducted. What now?$q$, $q$If the money was taken, the order usually shows as paid within a few minutes (My account → My orders). If not, the bank normally returns a failed payment automatically. Email us the order number and payment details if it doesn't show up.$q$, $q$payment failed, money deducted, amount debited, paisa kat gaya, refund payment, double payment$q$),
  ($q$When do I get a refund?$q$, $q$For a cancelled prepaid order or an accepted return, we arrange the refund to your original payment method; it can take a few working days to reach your account. Email us your order number if you have any question.$q$, $q$refund, money back, paisa wapas, refund kab$q$),
  ($q$My GSTIN or company name on the invoice is wrong.$q$, $q$Email us your order number and the correct company name and GSTIN as soon as possible, ideally before the order is dispatched.$q$, $q$wrong gstin, invoice correction, wrong company name, change invoice$q$),
  ($q$Do you have bulk or wholesale prices?$q$, $q$Yes – many products show lower prices for 10+ pieces right on the product page. For larger quantities or a full parts list, use /quick-order or request a quote on /bulk-quote.$q$, $q$wholesale, dealer price, bulk rate, quantity discount, reseller, distributor$q$),
  ($q$How do I use a coupon code?$q$, $q$Enter the coupon code in the cart before checkout; the discount is shown in the total if the code is valid.$q$, $q$coupon, promo code, discount code, offer code, voucher$q$),
  ($q$The product I need is out of stock.$q$, $q$On the product page, use “Notify me when back in stock” and we'll email you. If you need it urgently or in quantity, request a quote on /bulk-quote and we'll try to source it.$q$, $q$out of stock, not available, stock nahi, unavailable, back in stock$q$),
  ($q$Which brands do you repair?$q$, $q$VFDs/drives: Delta, Yaskawa, Mitsubishi, Siemens, ABB, Schneider, Danfoss, INVT, Fuji. SMPS: Mean Well, Delta, Omron, Siemens SITOP, Phoenix Contact, Schneider. PLC: Siemens, Allen-Bradley, Mitsubishi, Omron, Delta, Schneider, Fatek. Other makes too – upload photos on /pcb-repair for a free check.$q$, $q$brand, brands, which company, make, model repair, delta, siemens, abb, yaskawa, mitsubishi, allen bradley$q$),
  ($q$How long does a repair take?$q$, $q$You get a free quote within 1–2 working days of uploading photos on /pcb-repair. The repair time depends on the board and parts and is given with the quote; you can follow every step on /track (Repair tab).$q$, $q$repair time, how long repair, kitne din repair, turnaround, repair days$q$),
  ($q$How do I send my board for repair?$q$, $q$First upload photos of the board on /pcb-repair. After the free quote, we send you instructions for sending the board. No work is done without your approval of the price.$q$, $q$send board, courier board, pickup, how to send, dispatch board, board bhejna$q$),
  ($q$What if my board cannot be repaired?$q$, $q$After checking the photos we tell you in the quote whether it can be repaired. No repair work is done without your approval of the price. If it isn't repairable, ask us about a replacement or the exchange offer on suitable products.$q$, $q$cannot repair, not repairable, beyond repair, dead board, repair nahi$q$),
  ($q$Do you give warranty on repairs?$q$, $q$Yes – every repair comes with a 6-month repair warranty. Each repaired board is load-tested and you get a test video before we ship it back.$q$, $q$repair warranty, guarantee repair, repair ke baad$q$),
  ($q$What is the exchange offer?$q$, $q$On products marked “Exchange offer” you can send back your old faulty board and pay a lower price for the new one. Ask for the exchange price on the product page.$q$, $q$exchange, old board, purana board, trade in, swap$q$),
  ($q$My VFD shows a fault code. What does it mean?$q$, $q$Look up the fault code on /fault-codes (Delta, INVT, Mitsubishi and more) and the step-by-step guides on /repair-guides. If the drive still trips, upload photos on /pcb-repair for a free repair quote.$q$, $q$fault code, error code, alarm, trip, oc, ov, uv, oh, display error$q$),
  ($q$I didn't receive the login code email.$q$, $q$Wait a minute and check your spam or promotions folder. You can request a new code, or log in with your password on /login (Forgot password? on /forgot-password).$q$, $q$otp not received, code not received, no email, login code, otp nahi aaya$q$),
  ($q$Can I order without creating an account?$q$, $q$To place an order you log in with your email – a 6-digit code is sent to you, so no password is needed. Tracking an order on /track works without logging in.$q$, $q$without account, guest checkout, no login, bina account$q$),
  ($q$How do I get the invoice for my order?$q$, $q$The GST invoice PDF is emailed when your order is confirmed, and you can download it any time from My account → My orders → Invoice.$q$, $q$download invoice, invoice copy, bill copy, invoice pdf, bill chahiye$q$),
  ($q$Can I become a repair partner or technician with you?$q$, $q$Yes – repair technicians can apply on /repair-partners. Open jobs are listed on /careers.$q$, $q$technician, partner, franchise, join, work, naukri, job$q$),
  ($q$How can I talk to a person?$q$, $q$Email us at the address on the /contact page and include your order number or part number so we can help quickly.$q$, $q$talk to person, human, agent, call me, customer care, support, baat karni$q$)
) as v(question, answer, keywords)
where not exists (select 1 from private.seeded_faq s where s.question = v.question)
  and not exists (select 1 from public.ai_knowledge k where lower(k.question) = lower(v.question));
insert into private.seeded_faq (question)
select v.question from (values
  ($q$Are your products original / genuine?$q$),
  ($q$Do you deliver all over India?$q$),
  ($q$Is there an extra charge for cash on delivery?$q$),
  ($q$Can you dispatch today / urgently?$q$),
  ($q$Is there a minimum order?$q$),
  ($q$Do prices include GST?$q$),
  ($q$Do you ship outside India?$q$),
  ($q$How do I find a replacement or equivalent part?$q$),
  ($q$Where can I get the datasheet or manual?$q$),
  ($q$Can my company buy on credit or with a purchase order?$q$),
  ($q$Can I change my address or order after placing it?$q$),
  ($q$I forgot my order number. How do I track my order?$q$),
  ($q$Payment failed but money was deducted. What now?$q$),
  ($q$When do I get a refund?$q$),
  ($q$My GSTIN or company name on the invoice is wrong.$q$),
  ($q$Do you have bulk or wholesale prices?$q$),
  ($q$How do I use a coupon code?$q$),
  ($q$The product I need is out of stock.$q$),
  ($q$Which brands do you repair?$q$),
  ($q$How long does a repair take?$q$),
  ($q$How do I send my board for repair?$q$),
  ($q$What if my board cannot be repaired?$q$),
  ($q$Do you give warranty on repairs?$q$),
  ($q$What is the exchange offer?$q$),
  ($q$My VFD shows a fault code. What does it mean?$q$),
  ($q$I didn't receive the login code email.$q$),
  ($q$Can I order without creating an account?$q$),
  ($q$How do I get the invoice for my order?$q$),
  ($q$Can I become a repair partner or technician with you?$q$),
  ($q$How can I talk to a person?$q$)
) as v(question)
on conflict do nothing;
