# RoboDukaan

Online store for robotics parts, electronic components and DIY kits, built with **Next.js 16** and **Supabase**.

## Features

- Home page with categories and featured products
- Product listing with search and sorting, category pages, product detail pages with specs
- Cart saved in the browser
- Cash-on-delivery checkout: orders are created by a database function that checks stock and calculates prices, so totals can't be tampered with from the browser
- Order tracking with order number + mobile number
- Free shipping above ₹499 (₹49 otherwise)

## 1. Set up the database (once)

In the Supabase dashboard → **SQL Editor** → **New query**:

1. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
2. Paste the contents of [`supabase/seed.sql`](supabase/seed.sql) and click **Run** (40 sample products in 10 categories).

## 2. Run locally

```bash
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm install
npm run dev
```

Open http://localhost:3000.

## Managing the store

Until an admin panel is added, use the Supabase dashboard **Table Editor**:

- **products**: add/edit products, prices, stock, `image_url`, `is_featured`, `is_active`
- **categories**: add/edit categories (`icon` is one of: chip, sensor, motor, drone, battery, display, wifi, component, wrench, kit)
- **orders** / **order_items**: see new orders and change `status` (pending → confirmed → shipped → delivered, or cancelled)

Catalog changes appear on the site within about a minute.

## Deploy

Deploy to [Vercel](https://vercel.com/new): import this GitHub repository and add the two environment variables from `.env.example`.
