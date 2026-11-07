# Move the database from Supabase cloud to your VPS – step by step

Do this whenever you are ready. Everything works from a phone:
**Hostinger → VPS → Browser terminal**, then copy-paste one line at a time.
The website keeps using Supabase cloud until the last step, and that step can be undone.

Never paste passwords or keys into a chat – only into the server terminal.

---

## Part A – Get ready (phone browser, 10 minutes)

### A1. Add the DNS record
Hostinger → **Domains** → pcbdukaan.com → **DNS / Nameservers** → **Add record**

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | api | your VPS IP (e.g. 201.18.216.159) | default |

(If your domain uses Cloudflare, add the same record in Cloudflare with the cloud **grey / DNS only**.)
Wait 10 minutes.

### A2. Copy the database connection string
Supabase → your project → **Connect** (top) → **Session pooler** → copy the URI.
Replace `[YOUR-PASSWORD]` with your database password.
Forgot it? Project Settings → Database → **Reset database password**.

### A3. Create storage keys (for photos and documents)
Supabase → **Project Settings** → **Storage** → **S3 Connection** → **New access key**.
Note the **Access key ID** and **Secret access key** (the secret is shown only once).

---

## Part B – On the server (Hostinger browser terminal)

### B1. Check the server and get the newest scripts

```bash
free -h; df -h /
```
You need **4 GB RAM or more** (the "total" column) and **10 GB free disk** ("Avail").

```bash
sudo bash /opt/robodukaan/deploy/update.sh
```

```bash
ls /opt/robodukaan/deploy/vps-db/
```
You should see: `1-install.sh  2-copy-data.sh  3-switch.sh  move-all.sh`

### B2. Check the DNS record works

```bash
getent hosts api.pcbdukaan.com
```
It must show your VPS IP. If it shows nothing, wait a few more minutes.

---

## Part C – Move the database

### Option 0 – fully automatic (run once, then close the terminal)

```bash
sudo bash /opt/robodukaan/deploy/vps-db/auto-move.sh
```

Enter the connection string and storage keys once. The server then waits until the DNS record works,
installs Supabase, waits for the night (1–5 AM), copies everything, checks the counts, switches the website,
tests it (and switches back by itself if something fails), and **emails you the result**.
Progress: `sudo tail -f /var/log/pcbdukaan-move.log` · Cancel: `sudo systemctl stop pcbdukaan-move`

### Option 1 – everything in one command (you watch it)

```bash
sudo bash /opt/robodukaan/deploy/vps-db/move-all.sh
```

It asks for the connection string (A2) and the two storage keys (A3), copies everything, and at the end asks
**"Switch the website now?"** – type `yes` to switch, or anything else to stay on the cloud.

### Option 2 – one step at a time

**Step 1 – install Supabase on the VPS (10–20 minutes)**
```bash
sudo bash /opt/robodukaan/deploy/vps-db/1-install.sh
```
Write down the dashboard password shown at the end (dashboard: https://api.pcbdukaan.com, user `admin`).

**Step 2 – copy all data and files (safe to repeat)**
```bash
sudo bash /opt/robodukaan/deploy/vps-db/2-copy-data.sh
```
Check that the "cloud" and "VPS" numbers at the end match.

**Step 3 – switch the website (best at night)**
Run step 2 once more for the newest orders, then:
```bash
sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh
```

---

## Part D – Test after switching

1. Open https://pcbdukaan.com – products and photos show.
2. Log in with your account (same password as before).
3. Open the admin panel – orders and products are there.
4. Place a small test order, then cancel it in admin.
5. Log out and use "login with code" – the email code arrives.

### Something wrong? Go back to the cloud

```bash
sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh --back
```

---

## Part E – Useful commands later

Is Supabase running?
```bash
cd /opt/supabase && sudo docker compose ps
```

Restart Supabase:
```bash
cd /opt/supabase && sudo docker compose restart
```

Backups (made every night at 2:30 AM, kept 14 days):
```bash
sudo ls -lh /var/backups/pcbdukaan
```

Make a backup now:
```bash
sudo systemctl start robodukaan-backup
```

Disk space:
```bash
df -h /
```

Dashboard password (if you lost it):
```bash
sudo grep ^DASHBOARD_PASSWORD /opt/supabase/.env
```

If any step stops with a line starting with `!!`, that line says what is wrong.
Keep the Supabase cloud project for a few weeks after switching as a fallback – it costs nothing.
