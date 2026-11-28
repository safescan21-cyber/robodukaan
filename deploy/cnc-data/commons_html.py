"""Search Wikimedia Commons through its normal HTML pages (the API is rate-limited from this server).

python3 -I commons_html.py search "query" ...   -> list File: titles found
python3 -I commons_html.py file "File:Name.jpg"  -> licence, author, description, image URL (JSON)
"""
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def fetch(url):
    time.sleep(4)
    return subprocess.run(["curl", "-s", "-L", "--max-time", "40", "-A", UA, url], capture_output=True, text=True).stdout


def search(q):
    url = "https://commons.wikimedia.org/w/index.php?" + urllib.parse.urlencode({"search": q, "title": "Special:Search", "ns6": 1, "fulltext": 1, "limit": 40})
    s = fetch(url)
    return sorted(set(html.unescape(urllib.parse.unquote(x)) for x in re.findall(r'href="/wiki/(File:[^"#?]+)"', s)))


def text(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment or ""))).strip()


def file_info(title):
    s = fetch("https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")))
    lic = re.search(r'<span class="licensetpl_short"[^>]*>(.*?)</span>', s, re.S)
    lic_url = re.search(r'<span class="licensetpl_link"[^>]*>(.*?)</span>', s, re.S)
    attr = re.search(r'<span class="licensetpl_attr"[^>]*>(.*?)</span>', s, re.S)
    author = re.search(r'<td[^>]*id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', s, re.S)
    desc = re.search(r'<td[^>]*id="fileinfotpl_desc"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', s, re.S)
    full = re.search(r'<div class="fullImageLink"[^>]*>\s*<a href="(https://upload\.wikimedia\.org/[^"]+)"', s)
    return {
        "title": title, "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
        "license": text(lic.group(1)) if lic else "", "license_url": text(lic_url.group(1)) if lic_url else "",
        "attribution": text(attr.group(1)) if attr else "", "author": text(author.group(1))[:120] if author else "",
        "description": text(desc.group(1))[:300] if desc else "", "image": full.group(1) if full else "",
    }


if __name__ == "__main__":
    mode, args = sys.argv[1], sys.argv[2:]
    for a in args:
        if mode == "search":
            print("===", a)
            for t in search(a):
                print("  ", t)
        else:
            print(json.dumps(file_info(a), ensure_ascii=False))
