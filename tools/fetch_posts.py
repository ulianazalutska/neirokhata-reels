"""Fetch recent posts of the public channel t.me/s/neirokhata into posts.json (newest first).
Used by the studio as the list of topics for reels."""
import json, pathlib, re
import requests
from bs4 import BeautifulSoup

CHANNEL = "neirokhata"
OUT = pathlib.Path(__file__).resolve().parent.parent / "posts.json"


def page(before=None):
    url = f"https://t.me/s/{CHANNEL}" + (f"?before={before}" if before else "")
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (neirokhata-reels)"}, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for msg in soup.select("div.tgme_widget_message[data-post]"):
        try:
            pid = int(msg["data-post"].split("/")[-1])
        except ValueError:
            continue
        el = msg.select_one(".tgme_widget_message_text")
        if not el:
            continue
        for br in el.find_all("br"):
            br.replace_with("\n")
        text = el.get_text().strip()
        if len(text) < 60:
            continue
        t = msg.select_one("time[datetime]")
        title = re.sub(r"^\W+", "", text.split("\n")[0]).strip()
        out.append({"id": pid, "date": t["datetime"] if t else "", "title": title[:140], "text": text[:3000],
                    "url": f"https://t.me/{CHANNEL}/{pid}"})
    return out


def main():
    posts, before = {}, None
    for _ in range(3):
        got = page(before)
        if not got:
            break
        for p in got:
            posts[p["id"]] = p
        before = min(p["id"] for p in got)
    data = sorted(posts.values(), key=lambda p: -p["id"])[:60]
    new = json.dumps(data, ensure_ascii=False, indent=1)
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != new:
        OUT.write_text(new, encoding="utf-8")
        print("posts.json updated:", len(data))
    else:
        print("no changes")


main()
