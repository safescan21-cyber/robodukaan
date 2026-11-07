# Move the database from Supabase cloud to your VPS

Everything can be done from a phone: open **Hostinger → VPS → Browser terminal** and paste one line per step.
The website keeps working on Supabase cloud until step 3, and step 3 can be undone with one command.

## Before you start (5 minutes, in a phone browser)

1. **DNS record** – Hostinger → Domains → pcbdukaan.com → DNS → *Add record*:
   Type **A**, Name **api**, Points to **your VPS IP**, TTL default. (Using Cloudflare? Add it there, grey cloud.)
2. **Database connection string** – Supabase → your project → **Connect** → *Session pooler* → copy.
   Replace `[YOUR-PASSWORD]` with your database password (forgot it? Project Settings → Database → Reset).
   *Skip this if you already set up the daily backup – it is reused.*
3. **Storage keys** – Supabase → Project Settings → **Storage** → *S3 Connection* → **New access key**.
   Keep the *Access key ID* and *Secret access key* (the secret is shown only once).

Paste passwords and keys only into the server terminal – never into chat.

## Step 1 – install Supabase on the VPS (10–20 minutes)

```bash
sudo bash /opt/robodukaan/deploy/vps-db/1-install.sh
```

At the end it shows the dashboard address `https://api.pcbdukaan.com` with user `admin` and a password – write it down.

## Step 2 – copy all data and files (a few minutes)

```bash
sudo bash /opt/robodukaan/deploy/vps-db/2-copy-data.sh
```

It asks for the connection string and the two storage keys, copies customers (with their passwords), products,
orders, reviews, repairs, quotes and all photos/documents, and shows cloud vs VPS counts. Safe to run again.

## Step 3 – switch the website (best at night)

Run step 2 once more (for the newest orders), then straight away:

```bash
sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh
```

Then test: log in, open a product, place a test order, open the admin panel.

**Undo** (back to Supabase cloud):

```bash
sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh --back
```

## After the move

- Nightly backup at 2:30 AM of the database and files → `/var/backups/pcbdukaan` (14 days).
- Keep the cloud project for a few weeks as a fallback; it pauses by itself and costs nothing.
- Login codes and password emails are sent from your own mailbox with the PCBDukaan design.
- Check disk space now and then: `df -h /`
