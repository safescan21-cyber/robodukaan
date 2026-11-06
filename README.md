# PCBDukaan

Online store for industrial PCBs, electronics and PCB repair (pcbdukaan.com), built with **Next.js 16** and **Supabase** (database, login, image storage).

## Features

**Shop**
- Home page with banner slider, categories, deals, best sellers, new arrivals
- Shop page with search, category filter, price range, in-stock filter, sorting and pagination
- Product pages: image gallery, specifications, downloads, FAQs, reviews with star ratings, wishlist, WhatsApp share
- Cart with coupon codes, cash-on-delivery checkout (guest or logged in), order tracking

**Customer account**
- Register / login / forgot password
- Dashboard, order history with order details and cancellation, saved addresses, wishlist, profile & password

**Admin panel** (`/admin`)
- Dashboard: revenue, orders, customers, 14-day sales chart, low stock, top sellers
- Products: add/edit with image upload, specs, FAQs, downloads; quick stock / featured / visible toggles
- Categories, orders (status, payment, courier tracking link, WhatsApp the customer), customers (make admin), coupons, reviews (hide/delete), home page banners

**Security**: prices, stock, coupons and totals are calculated inside the database (`place_order`), and Row Level Security means customers can only see their own orders and can't change prices or make themselves admin.

## 1. Set up the database (once)

In the Supabase dashboard → **SQL Editor** → **New query**:

1. Paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. Paste all of [`supabase/seed.sql`](supabase/seed.sql) → **Run** (39 sample products, 10 categories, 3 banners, 2 coupons).

Both scripts are safe to run again.

## 2. Make yourself admin

1. Register on the website with your email.
2. In the SQL Editor run (with your email):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

3. Log in again — an **Admin** button appears in the header. More admins can be added from **Admin → Customers**.

## 3. Login emails

In Supabase → **Authentication → URL Configuration**, set **Site URL** to your website address (e.g. `https://robodukaan.vercel.app`) so confirmation and password-reset emails link back to your site. Supabase's built-in email sender is limited to a few emails per hour; for a live store, add your own SMTP under **Authentication → Emails**.

## Run locally

```bash
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm install
npm run dev
```

## Store details

Phone number and email shown on the site are in `src/lib/constants.ts` (`STORE`).

## Deploy

Import this repository on [Vercel](https://vercel.com/new) and add the two environment variables from `.env.example`.
