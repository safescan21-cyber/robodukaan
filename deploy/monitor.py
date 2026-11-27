#!/usr/bin/env python3
"""PCBDukaan site monitor – runs every 5 minutes (robodukaan-monitor.timer, installed by ensure-monitor.sh).

Checks the website, every API, the database, server services, disk, memory and SSL certificates.

Self-repair: when something fails, the monitor first tries a safe fix (restart the stopped service, start the
database containers, free disk space, renew the SSL certificate, repair the login emails …), checks again and
emails what it did. Each fix runs at most 3 times in 6 hours, never while a website update is running, and
nothing is ever deleted except caches, old logs and unused Docker images.

Early warnings: low disk space, low memory, an SSL certificate close to expiry, slow pages, many errors in the
website log, an old database backup, or a service that keeps crashing – emailed once a day while they last,
with a preventive fix where one is safe.

Emails the admin when a check is still failing after the fix, every 6 hours while it stays broken, and when it
recovers. Writes the latest results to /var/lib/robodukaan-monitor/status.json for Admin → Site health.
Only harmless requests are made: invalid form data that the API must reject, no orders or emails created.
"""
import datetime, fcntl, glob, json, os, shutil, smtplib, socket, ssl, subprocess, time, urllib.error, urllib.request
from email.message import EmailMessage

SITE = os.environ.get("MONITOR_SITE", "https://pcbdukaan.com").rstrip("/")
APP_DIR = os.environ.get("APP_DIR", "/opt/robodukaan")
OUT_DIR = "/var/lib/robodukaan-monitor"
STATE = os.path.join(OUT_DIR, "state.json")
STATUS = os.path.join(OUT_DIR, "status.json")
REMIND_SECONDS = 6 * 3600
WARN_REMIND_SECONDS = 24 * 3600
FIX_LIMIT, FIX_WINDOW = 3, 6 * 3600          # each fix at most 3 times in 6 hours
SLOW_SECONDS = 5                             # pages slower than this → early warning
LAST_TIMES = {}                              # check name → seconds the request took (for the slow-page warning)


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


def check_page(path, name=None):
    def run():
        s, body, sec = http("GET", path, timeout=25)
        LAST_TIMES[path] = sec
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


# ─────────────────────────── automatic fixes ───────────────────────────
def run(cmd, cwd=None, timeout=300):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, shell=isinstance(cmd, str))
        return r.returncode == 0, (r.stdout + r.stderr).strip()[-300:]
    except Exception as e:
        return False, str(e)


def wait_for(fn, seconds):
    end = time.time() + seconds
    while time.time() < end:
        try:
            r = fn()
            if r and r[0]:
                return True
        except Exception:
            pass
        time.sleep(5)
    return False


def sb_dir():
    d = env_file("/etc/robodukaan/selfhost.env").get("SB_DIR")
    return d if d and os.path.isdir(d) and "api.pcbdukaan.com" in DB_URL else None


def fix_db():
    d = sb_dir()
    if not d:
        return "no self-hosted database here – nothing to restart"
    ok, out = run(["docker", "compose", "up", "-d"], cwd=d, timeout=240)
    # containers that exist but are stuck (restarting / unhealthy / exited) get a restart
    ok2, ps = run(["docker", "compose", "ps", "-a", "--format", "{{.Service}} {{.Status}}"], cwd=d)
    stuck = [l.split()[0] for l in ps.splitlines() if l.strip() and "edge-functions" not in l and not ("Up" in l and "unhealthy" not in l)]
    if stuck:
        run(["docker", "compose", "restart", *stuck], cwd=d, timeout=240)
    back = wait_for(check_db, 90)
    return f"started the database containers{' and restarted ' + ', '.join(stuck) if stuck else ''} – {'database answers again' if back else 'still not answering'}"


def fix_nginx():
    ok, out = run(["nginx", "-t"])
    if not ok:
        return f"nginx settings have an error, not restarted (would take the site down): {out[-160:]}"
    run(["systemctl", "restart", "nginx"])
    return "restarted the web server (nginx)" + ("" if wait_for(check_service("nginx"), 20) else " – but it did not start")


def fix_app():
    run(["systemctl", "restart", "robodukaan"])
    back = wait_for(check_page("/"), 90)
    return "restarted the shop app" + (" – home page loads again" if back else " – home page still not loading")


def fix_ollama():
    run(["systemctl", "restart", "ollama"])
    return "restarted the AI chat (ollama)" + ("" if wait_for(check_service("ollama"), 30) else " – but it did not start")


def fix_disk():
    before = shutil.disk_usage("/").free
    for cmd in (
        ["journalctl", "--vacuum-size=200M"],
        ["apt-get", "clean"],
        ["docker", "image", "prune", "-f"],
        ["docker", "builder", "prune", "-f"],
        "find /tmp /var/tmp -xdev -type f -mtime +7 -delete 2>/dev/null",
        "find /var/log -xdev -type f \\( -name '*.gz' -o -name '*.[0-9]' \\) -mtime +14 -delete 2>/dev/null",
        f"sudo -u robodukaan -H npm cache clean --force >/dev/null 2>&1; rm -rf {APP_DIR}/.next/cache/fetch-cache",
    ):
        run(cmd, timeout=300)
    freed = (shutil.disk_usage("/").free - before) / 2**30
    return f"cleaned caches, old logs and unused Docker images – freed {max(freed, 0):.1f} GB"


def fix_memory():
    ok, out = run("ps -C ollama -o rss= | awk '{s+=$1} END {print s+0}'")
    ollama_mb = int(out or 0) // 1024 if out.strip().isdigit() else 0
    run("sync; echo 1 > /proc/sys/vm/drop_caches")
    if ollama_mb > 800:
        run(["systemctl", "restart", "ollama"])
        return f"freed memory: restarted the AI chat ({ollama_mb} MB) and cleared the file cache"
    return "cleared the file cache"


def fix_cert():
    ok, out = run(["certbot", "renew", "--quiet"], timeout=280)
    if ok:
        run(["systemctl", "reload", "nginx"])
    return "renewed the SSL certificates" if ok else f"SSL renewal failed: {out[-160:]}"


def fix_auth_email():
    script = os.path.join(APP_DIR, "deploy/vps-db/ensure-auth-email.sh")
    if not os.path.exists(script):
        return "repair script missing"
    ok, out = run(["bash", script], timeout=280)
    return "repaired the login email settings" if ok else f"login email repair failed: {out[-160:]}"


FIXES = {"db": fix_db, "nginx": fix_nginx, "app": fix_app, "ollama": fix_ollama, "auth_email": fix_auth_email,
         "disk": fix_disk, "memory": fix_memory, "cert": fix_cert}
FIX_ORDER = ["db", "nginx", "app", "ollama", "auth_email", "disk", "memory", "cert"]

# (name, check, fix, fails needed before fixing). Pages/APIs wait for 2 failures in a row (10 minutes) so a
# short blip doesn't restart the shop; a stopped service is fixed at once.
CHECKS = [
    ("Home page", check_page("/"), "app", 2),
    ("Products page", check_page("/products"), "app", 2),
    ("PCB repair page", check_page("/pcb-repair"), "app", 2),
    ("Repair guides", check_page("/repair-guides"), "app", 2),
    ("Sitemap", check_page("/sitemap.xml"), "app", 2),
    ("Login email layout (code)", check_page("/email-templates/magic-link.html"), "auth_email", 2),
    ("API: product search", check_api("GET", "/api/search?q=smps", None, 200, '"products"'), "app", 2),
    ("API: bulk quote", check_api("POST", "/api/quote", {"name": "Monitor", "phone": "1", "quantity": 1, "product_name": "x"}, 400, "mobile"), "app", 2),
    ("API: technician partner", check_api("POST", "/api/partner", {"name": "Monitor", "phone": "1", "city": "x"}, 400, "mobile"), "app", 2),
    ("API: stock alert", check_api("POST", "/api/stock-alert", {"product_id": "00000000-0000-0000-0000-000000000000", "email": "x"}, 400, "email"), "app", 2),
    ("API: vendor link", check_api("POST", "/api/vendor/00000000-0000-0000-0000-000000000000", {"action": "accept"}, 400, "valid"), "app", 2),
    ("API: admin lock", check_api("GET", "/api/admin/server-move", None, 403, "admins"), "app", 2),
    ("API: catalogue refresh lock", check_api("POST", "/api/revalidate", {}, 401, "signed in"), "app", 2),
    ("Database", check_db, "db", 1),
    ("Service: shop app", check_service("robodukaan"), "app", 1),
    ("Service: web server (nginx)", check_service("nginx"), "nginx", 1),
    ("Service: AI chat (ollama)", check_service("ollama"), "ollama", 1),
    ("Disk space", check_disk, "disk", 1),
    ("Memory", check_memory, "memory", 2),
    ("SSL pcbdukaan.com", check_cert("pcbdukaan.com"), "cert", 1),
    ("SSL api.pcbdukaan.com", check_cert("api.pcbdukaan.com"), "cert", 1),
    ("VPS database containers", check_selfhost_db, "db", 1),
    ("Login emails (6-digit code)", check_auth_email, "auth_email", 1),
]


# ─────────────────────────── early warnings ───────────────────────────
def warn_disk():
    u = shutil.disk_usage("/")
    free = u.free / u.total * 100
    return free >= 20, f"{free:.0f}% free ({u.free / 2**30:.1f} GB) – it fails below 10%"


def warn_memory():
    avail = next((int(l.split()[1]) for l in open("/proc/meminfo") if l.startswith("MemAvailable")), 0) / 1024
    return avail >= 450, f"{avail:.0f} MB available – it fails below 250 MB"


def warn_cert():
    """Every certificate on this server (all sites), plus the weekly test renewal (deploy/ensure-ssl-renew.sh)."""
    bad, soonest = [], None
    for pem in glob.glob("/etc/letsencrypt/live/*/cert.pem"):
        ok, out = run(["openssl", "x509", "-enddate", "-noout", "-in", pem])
        if not ok or "=" not in out:
            continue
        try:
            exp = datetime.datetime.strptime(out.split("=", 1)[1].strip(), "%b %d %H:%M:%S %Y %Z")
        except ValueError:
            continue
        days = (exp - datetime.datetime.utcnow()).days
        name = pem.split("/")[-2]
        soonest = min(soonest, (days, name)) if soonest else (days, name)
        if days < 21:
            bad.append(f"{name} expires in {days} days")
    try:
        test = open(os.path.join(OUT_DIR, "ssl-renew.txt")).read().strip()
    except OSError:
        test = ""
    if test.startswith("FAILED"):
        bad.append(f"test renewal {test[:300]}")
    if bad:
        return False, "; ".join(bad)
    left = f"soonest: {soonest[1]} in {soonest[0]} days" if soonest else "more than 3 weeks left"
    return True, left + (" · weekly test renewal OK" if test.startswith("ok") else "")


def warn_slow():
    slow = [f"{p} {t:.1f}s" for p, t in LAST_TIMES.items() if t > SLOW_SECONDS]
    return not slow, ("slow: " + ", ".join(slow)) if slow else f"all pages under {SLOW_SECONDS}s"


def warn_app_errors():
    ok, out = run(["journalctl", "-u", "robodukaan", "--since", "-10min", "--no-pager", "-o", "cat"], timeout=30)
    lines = [l for l in out.splitlines() if any(w in l for w in ("Error", "ERROR", "Unhandled", "ECONNREFUSED", "FATAL"))] if ok else []
    if not ok:  # journal not readable – don't warn
        return True, "website log not readable"
    _, full = run(f"journalctl -u robodukaan --since -10min --no-pager -o cat | grep -cE 'Error|ERROR|Unhandled|ECONNREFUSED|FATAL'", timeout=30)
    n = int(full) if full.strip().isdigit() else len(lines)
    return n < 20, f"{n} errors in the website log in the last 10 minutes" + (f" – e.g. {lines[-1][:160]}" if n >= 20 and lines else "")


def warn_backup():
    files = [f for f in glob.glob("/var/backups/pcbdukaan/*") if os.path.isfile(f)]
    if not files:
        return None  # backups not set up on this server
    age = (time.time() - max(os.path.getmtime(f) for f in files)) / 3600
    return age < 36, f"newest database backup is {age:.0f} hours old"


def warn_crash_loop(state):
    def run_():
        recent = [t for t in state.get("_fixlog_times", {}).get("app", []) if time.time() - t < 24 * 3600]
        return len(recent) < 3, f"the shop app was restarted automatically {len(recent)} times in 24 hours"
    return run_


# (name, check, preventive fix or None)
WARNINGS = [
    ("Early warning: disk space", warn_disk, "disk"),
    ("Early warning: memory", warn_memory, None),
    ("Early warning: SSL certificate", warn_cert, "cert"),
    ("Early warning: slow pages", warn_slow, None),
    ("Early warning: website errors", warn_app_errors, None),
    ("Early warning: database backup", warn_backup, None),
]


def updating_now():
    """True while deploy/auto-update.sh is building or restarting the website."""
    try:
        f = open("/run/robodukaan-update.lock", "a")
    except OSError:
        return False
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fcntl.flock(f, fcntl.LOCK_UN)
        return False
    except OSError:
        return True
    finally:
        f.close()


def may_fix(state, key):
    times = [t for t in state.setdefault("_fixlog_times", {}).get(key, []) if time.time() - t < FIX_WINDOW]
    return len(times) < FIX_LIMIT


def do_fix(state, key, log):
    times = state.setdefault("_fixlog_times", {}).setdefault(key, [])
    times[:] = [t for t in times if time.time() - t < 24 * 3600] + [time.time()]
    try:
        what = FIXES[key]()
    except Exception as e:
        what = f"fix crashed: {e}"
    log.append(what)
    fixlog = state.setdefault("_fixlog", [])
    fixlog.insert(0, {"at": now_ist(), "fix": key, "result": what})
    del fixlog[20:]
    return what


def now_ist():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime("%d %b %Y %H:%M IST")


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


def run_check(fn):
    try:
        return fn()
    except Exception as e:
        return (False, f"check crashed: {e}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    try:
        state = json.load(open(STATE))
    except Exception:
        state = {}
    now = time.time()
    results, by_name = [], {}
    for name, fn, fix, need in CHECKS:
        r = run_check(fn)
        if r is None:
            continue
        ok, detail = r
        row = {"name": name, "ok": ok, "detail": detail}
        results.append(row)
        by_name[name] = (row, fn, fix, need)

    # ── self-repair: fix what failed (often enough), then check those again ──
    fixed, fix_log, skipped = [], [], []
    failing = [r for r in results if not r["ok"]]
    if failing and updating_now():
        skipped.append("a website update is running – no fixes this time")
    elif failing:
        wanted = []
        for r in failing:
            _, _, fix, need = by_name[r["name"]]
            fails_so_far = state.get(r["name"], {}).get("fails", 0) + 1
            if fix and fails_so_far >= need and fix not in wanted:
                wanted.append(fix)
        for key in sorted(wanted, key=FIX_ORDER.index):
            if not may_fix(state, key):
                skipped.append(f"{key}: already tried {FIX_LIMIT} times in 6 hours – needs a person")
                continue
            do_fix(state, key, fix_log)
        if fix_log:
            time.sleep(5)
            for r in failing:
                row, fn, _, _ = by_name[r["name"]]
                again = run_check(fn)
                if again and again[0]:
                    row["ok"], row["detail"] = True, again[1] + " (fixed automatically)"
                    fixed.append(row)

    # ── early warnings (with a preventive fix where it is safe) ──
    warn_rows = []
    for name, fn, prevent in WARNINGS + [("Early warning: shop app keeps crashing", warn_crash_loop(state), None)]:
        r = run_check(fn)
        if r is None:
            continue
        ok, detail = r
        if not ok and prevent and not updating_now() and may_fix(state, prevent):
            what = do_fix(state, prevent, fix_log)
            r2 = run_check(fn)
            if r2 and r2[0]:
                ok, detail = True, f"{r2[1]} (prevented: {what})"
            else:
                detail += f" – tried: {what}"
        warn_rows.append({"name": name, "ok": ok, "detail": detail, "warn": True})

    newly_bad, still_bad, recovered = [], [], []
    for r in results:
        if r in fixed:
            state[r["name"]] = {"fails": 0, "alerted": 0}
            continue
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

    new_warns = []
    for w in warn_rows:
        s = state.get(w["name"], {"alerted": 0})
        if w["ok"]:
            s = {"alerted": 0}
        elif not s.get("alerted") or now - s["alerted"] >= WARN_REMIND_SECONDS:
            new_warns.append(w)
            s["alerted"] = now
        state[w["name"]] = s

    ts = now_ist()
    json.dump({"checked_at": ts, "results": results + warn_rows, "fixes": state.get("_fixlog", [])[:20]}, open(STATUS, "w"), indent=1)
    os.chmod(STATUS, 0o644)
    json.dump(state, open(STATE, "w"))

    fmt = lambda rows, mark: "\n".join(f"{mark} {r['name']}: {r['detail']}" for r in rows)
    did = "\n".join(f"🔧 {x}" for x in fix_log)
    if fixed:
        send_mail(f"🔧 PCBDukaan fixed itself: {', '.join(r['name'] for r in fixed)[:110]}",
                  f"The monitor found a problem and fixed it automatically ({ts}).\n\nWhat was wrong:\n{fmt(fixed, '✓')}\n\n"
                  f"What it did:\n{did}\n\nNothing for you to do. If this email comes often, the server may need a closer look.")
    if newly_bad or still_bad:
        rows = newly_bad + still_bad
        body = (f"PCBDukaan monitor ({ts}) found a problem it could NOT fix by itself:\n\n{fmt(rows, '✕')}\n\n"
                + (f"Automatic fixes tried:\n{did}\n\n" if did else "")
                + (f"Not tried: {'; '.join(skipped)}\n\n" if skipped else "")
                + f"All checks:\n{fmt(results, '•')}\n\n"
                "Open Admin → Site health, or send these details for help.")
        send_mail(f"⚠️ PCBDukaan problem: {', '.join(r['name'] for r in rows)[:120]}", body)
    if new_warns:
        send_mail(f"⏳ PCBDukaan early warning: {', '.join(w['name'].replace('Early warning: ', '') for w in new_warns)[:110]}",
                  f"Nothing is broken yet, but this may cause a problem soon ({ts}):\n\n{fmt(new_warns, '⚠')}\n\n"
                  + (f"Automatic prevention tried:\n{did}\n\n" if did else "")
                  + "You get this at most once a day while it lasts.")
    if recovered:
        send_mail(f"✓ PCBDukaan recovered: {', '.join(r['name'] for r in recovered)[:120]}",
                  f"Working again ({ts}):\n\n{fmt(recovered, '✓')}")
    print(f"{ts}: {sum(r['ok'] for r in results)}/{len(results)} OK, {len(fixed)} fixed, "
          f"{sum(not w['ok'] for w in warn_rows)} warnings" + (f" – {'; '.join(fix_log)}" if fix_log else ""))


if __name__ == "__main__":
    main()
