#!/usr/bin/env python3
"""PCBDukaan site monitor – runs every 5 minutes (robodukaan-monitor.timer, installed by ensure-monitor.sh).

Checks the website, every API, the database, server services, disk, memory and SSL certificates.
Emails the admin when a check fails twice in a row, every 6 hours while it stays broken, and when it
recovers. Writes the latest results to /var/lib/robodukaan-monitor/status.json for Admin → Site health.
Only harmless requests are made: invalid form data that the API must reject, no orders or emails created.
"""
import datetime, json, os, shutil, smtplib, socket, ssl, subprocess, time, urllib.error, urllib.request
from email.message import EmailMessage

SITE = os.environ.get("MONITOR_SITE", "https://pcbdukaan.com").rstrip("/")
APP_DIR = os.environ.get("APP_DIR", "/opt/robodukaan")
OUT_DIR = "/var/lib/robodukaan-monitor"
STATE = os.path.join(OUT_DIR, "state.json")
STATUS = os.path.join(OUT_DIR, "status.json")
REMIND_SECONDS = 6 * 3600


def env_file(path):
    out = {}
    try:
        for line in open(path):
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.rstrip("\n").split("=", 1)
                out[k.strip()] = v.strip().strip("'\"")
    except OSError:
        pass
    return out


APP_ENV = env_file(os.path.join(APP_DIR, ".env.local"))
DB_URL = APP_ENV.get("NEXT_PUBLIC_SUPABASE_URL", "")
DB_KEY = APP_ENV.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")


def http(method, path, body=None, headers=None, timeout=20):
    url = path if path.startswith("http") else SITE + path
    data = json.dumps(body).encode() if body is not None else None
    h = {"User-Agent": "pcbdukaan-monitor", **({"Content-Type": "application/json"} if data else {}), **(headers or {})}
    t = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=h), timeout=timeout) as r:
            return r.status, r.read(200_000).decode("utf-8", "ignore"), time.time() - t
    except urllib.error.HTTPError as e:
        return e.code, e.read(5000).decode("utf-8", "ignore"), time.time() - t
    except Exception as e:  # timeout, DNS, connection refused …
        return 0, str(e), time.time() - t


def check_page(path):
    def run():
        s, body, sec = http("GET", path, timeout=25)
        ok = s == 200 and sec < 15
        return ok, f"HTTP {s} in {sec:.1f}s" + ("" if ok else f" – {body[:120]}" if s != 200 else " (slow)")
    return run


def check_api(method, path, body, want_status, want_text):
    def run():
        s, text, sec = http(method, path, body)
        ok = s == want_status and want_text.lower() in text.lower()
        return ok, f"HTTP {s} in {sec:.1f}s" + ("" if ok else f" – expected {want_status}: {text[:120]}")
    return run


def check_db():
    if not DB_URL:
        return False, "database address missing in .env.local"
    s, text, sec = http("GET", DB_URL + "/auth/v1/health", headers={"apikey": DB_KEY})
    if s != 200:
        return False, f"login service HTTP {s}: {text[:120]}"
    s, text, sec2 = http("GET", DB_URL + "/rest/v1/products?select=id&limit=1", headers={"apikey": DB_KEY})
    return s == 200, f"{DB_URL.split('//')[1]} – login OK, products HTTP {s} in {sec + sec2:.1f}s"


def check_service(name):
    def run():
        r = subprocess.run(["systemctl", "is-active", name], capture_output=True, text=True)
        state = r.stdout.strip() or r.stderr.strip()
        return state == "active", state
    return run


def check_disk():
    u = shutil.disk_usage("/")
    free = u.free / u.total * 100
    return free >= 10, f"{u.free / 2**30:.1f} GB free ({free:.0f}%)"


def check_memory():
    info = {}
    for line in open("/proc/meminfo"):
        k, v = line.split(":", 1)
        info[k] = int(v.split()[0])  # kB
    avail = info.get("MemAvailable", 0) / 1024
    total = info.get("MemTotal", 1) / 1024
    return avail >= 250, f"{avail:.0f} MB available of {total:.0f} MB"


def check_cert(host):
    def run():
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((host, 443), timeout=10) as sock, ctx.wrap_socket(sock, server_hostname=host) as s:
                exp = datetime.datetime.strptime(s.getpeercert()["notAfter"], "%b %d %H:%M:%S %Y %Z")
            days = (exp - datetime.datetime.utcnow()).days
            return days >= 14, f"valid {days} more days (until {exp:%d %b %Y})"
        except Exception as e:
            return False, f"SSL check failed: {e}"
    return run


def check_selfhost_db():
    sb_dir = env_file("/etc/robodukaan/selfhost.env").get("SB_DIR")
    if not sb_dir or "api.pcbdukaan.com" not in DB_URL:
        return None  # website still uses Supabase cloud – nothing to check on the VPS
    r = subprocess.run(["docker", "compose", "ps", "--format", "{{.Name}} {{.Status}}"], cwd=sb_dir, capture_output=True, text=True)
    bad = [l for l in r.stdout.splitlines() if l.strip() and not any(w in l for w in ("Up", "healthy")) and "edge-functions" not in l]
    return not bad and r.returncode == 0, ("all containers up" if not bad else "; ".join(bad)[:200])


def check_auth_email():
    if "api.pcbdukaan.com" not in DB_URL:
        return None  # Supabase cloud sends the login emails
    r = subprocess.run(["docker", "inspect", "supabase-auth", "--format", "{{range .Config.Env}}{{println .}}{{end}}"], capture_output=True, text=True)
    ok = "PCBDukaan login code" in r.stdout and "storage:5000/object/public/email-templates" in r.stdout
    try:
        note = open(os.path.join(OUT_DIR, "auth-email.txt")).read().strip()
    except OSError:
        note = ""
    return ok, ("sends a 6-digit code" if ok else "sends the default link email") + (f" ({note})" if note and not note.startswith("ok") else "")


CHECKS = [
    ("Home page", check_page("/")),
    ("Products page", check_page("/products")),
    ("PCB repair page", check_page("/pcb-repair")),
    ("Repair guides", check_page("/repair-guides")),
    ("Sitemap", check_page("/sitemap.xml")),
    ("Login email layout (code)", check_page("/email-templates/magic-link.html")),
    ("API: product search", check_api("GET", "/api/search?q=smps", None, 200, '"products"')),
    ("API: bulk quote", check_api("POST", "/api/quote", {"name": "Monitor", "phone": "1", "quantity": 1, "product_name": "x"}, 400, "mobile")),
    ("API: technician partner", check_api("POST", "/api/partner", {"name": "Monitor", "phone": "1", "city": "x"}, 400, "mobile")),
    ("API: stock alert", check_api("POST", "/api/stock-alert", {"product_id": "00000000-0000-0000-0000-000000000000", "email": "x"}, 400, "email")),
    ("API: vendor link", check_api("POST", "/api/vendor/00000000-0000-0000-0000-000000000000", {"action": "accept"}, 400, "valid")),
    ("API: admin lock", check_api("GET", "/api/admin/server-move", None, 403, "admins")),
    ("API: catalogue refresh lock", check_api("POST", "/api/revalidate", {}, 401, "signed in")),
    ("Database", check_db),
    ("Service: shop app", check_service("robodukaan")),
    ("Service: web server (nginx)", check_service("nginx")),
    ("Service: AI chat (ollama)", check_service("ollama")),
    ("Disk space", check_disk),
    ("Memory", check_memory),
    ("SSL pcbdukaan.com", check_cert("pcbdukaan.com")),
    ("SSL api.pcbdukaan.com", check_cert("api.pcbdukaan.com")),
    ("VPS database containers", check_selfhost_db),
    ("Login emails (6-digit code)", check_auth_email),
]


def send_mail(subject, body):
    e = env_file("/etc/robodukaan/email.env")
    to = e.get("ADMIN_EMAIL") or e.get("SMTP_USER")
    if not (to and e.get("SMTP_HOST") and e.get("SMTP_USER") and e.get("SMTP_PASS")):
        print("email not configured – would send:", subject)
        return
    m = EmailMessage()
    m["From"] = f'{e.get("SENDER_NAME", "PCBDukaan")} <{e["SMTP_USER"]}>'
    m["To"] = to
    m["Subject"] = subject
    m.set_content(body)
    port = int(e.get("SMTP_PORT", "465"))
    if port == 465:
        s = smtplib.SMTP_SSL(e["SMTP_HOST"], port, context=ssl.create_default_context(), timeout=30)
    else:
        s = smtplib.SMTP(e["SMTP_HOST"], port, timeout=30)
        s.starttls(context=ssl.create_default_context())
    s.login(e["SMTP_USER"], e["SMTP_PASS"])
    s.send_message(m)
    s.quit()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    try:
        state = json.load(open(STATE))
    except Exception:
        state = {}
    now = time.time()
    results = []
    for name, fn in CHECKS:
        try:
            r = fn()
        except Exception as e:
            r = (False, f"check crashed: {e}")
        if r is None:
            continue
        ok, detail = r
        results.append({"name": name, "ok": ok, "detail": detail})

    newly_bad, still_bad, recovered = [], [], []
    for r in results:
        s = state.get(r["name"], {"fails": 0, "alerted": 0})
        if r["ok"]:
            if s.get("alerted"):
                recovered.append(r)
            s = {"fails": 0, "alerted": 0}
        else:
            s["fails"] = s.get("fails", 0) + 1
            if s["fails"] >= 2 and not s.get("alerted"):
                newly_bad.append(r)
                s["alerted"] = now
            elif s.get("alerted") and now - s["alerted"] >= REMIND_SECONDS:
                still_bad.append(r)
                s["alerted"] = now
        state[r["name"]] = s

    ts = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime("%d %b %Y %H:%M IST")
    json.dump({"checked_at": ts, "results": results}, open(STATUS, "w"), indent=1)
    os.chmod(STATUS, 0o644)
    json.dump(state, open(STATE, "w"))

    fmt = lambda rows, mark: "\n".join(f"{mark} {r['name']}: {r['detail']}" for r in rows)
    if newly_bad or still_bad:
        rows = newly_bad + still_bad
        body = (f"PCBDukaan monitor ({ts}) found a problem:\n\n{fmt(rows, '✕')}\n\n"
                f"All checks:\n{fmt(results, '•')}\n\n"
                "The website usually recovers by itself after an update or restart. If this stays, open Admin → Site health "
                "or ask for help with the details above.")
        send_mail(f"⚠️ PCBDukaan problem: {', '.join(r['name'] for r in rows)[:120]}", body)
    if recovered:
        send_mail(f"✓ PCBDukaan recovered: {', '.join(r['name'] for r in recovered)[:120]}",
                  f"Working again ({ts}):\n\n{fmt(recovered, '✓')}")
    print(f"{ts}: {sum(r['ok'] for r in results)}/{len(results)} OK")


if __name__ == "__main__":
    main()
