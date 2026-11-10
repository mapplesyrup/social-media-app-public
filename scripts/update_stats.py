"""Daily stats update for the Social media app (run by the morning Claude routine, see .claude/skills/stats-du-matin).

  python3 -I scripts/update_stats.py plan          -> JSON: today's date and the week windows to fetch from Buffer
  python3 -I scripts/update_stats.py merge <file>  -> merges a fetched-values JSON into public/data/stats.json
  python3 -I scripts/update_stats.py init          -> creates stats.json with one account per network of public/data/config.json

Fetched-values file:
{
  "date": "YYYY-MM-DD",
  "accounts": {"instagram": {"followers": 1240, "posts": 34}, "tiktok": {"followers": 310, "posts": 33, "likes": 2680},
               "linkedin": {"followers": 860}},
  "weeks": [{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "partial": false,
             "instagram": {"views": 0, "posts": 0, "reach": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0, "avgWatchSec": 0},
             "tiktok": {...}, "youtube": {...}}],
  "posts": [{"reelId": "...", "platform": "instagram", "bufferId": "...", "sentAt": "...", "metricsUpdatedAt": "...", "views": 0, ...}],
  "timeline": [{"id": "<buffer post id>", "platform": "instagram", "sentAt": "...", "views": 0}]
}
With several brands, key "accounts" by account id ("<brand>-<network>") and add "workspace" to each week and timeline post.
Every key is optional. A snapshot for the same date replaces the earlier one; weeks, posts and timeline entries are replaced
by start date, by bufferId and by id, and older ones are kept.
"""
import json, pathlib, sys
from datetime import date, datetime, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
STATS = ROOT / "public/data/stats.json"
PARIS = datetime.now().astimezone().tzinfo  # the computer's own time zone


def plan():
    today = datetime.now(PARIS).date()
    oldest = today - timedelta(days=30)
    monday = today - timedelta(days=today.weekday())
    weeks = []
    for k in range(5):
        start = monday - timedelta(days=7 * k)
        if start < oldest:
            break
        end = start + timedelta(days=6)
        last = min(end, today)
        iso = lambda d, t: datetime.combine(d, t, PARIS).isoformat()
        weeks.append({"start": start.isoformat(), "end": end.isoformat(), "partial": end >= today,
                      "startDateTime": iso(start, datetime.min.time()),
                      "endDateTime": iso(last, datetime.max.time().replace(microsecond=0))})
    print(json.dumps({"date": today.isoformat(), "weeks": list(reversed(weeks))}, indent=2))


def merge(path):
    new = json.loads(pathlib.Path(path).read_text())
    stats = json.loads(STATS.read_text())
    day = new.get("date") or date.today().isoformat()

    for item in stats.get("accounts", {}).get("items", []):
        acc = new.get("accounts") or {}
        values = acc.get(item.get("id") or item["platform"]) or acc.get(item["platform"])
        if not values or values.get("followers") is None:
            continue
        snap = {"date": day, **{k: v for k, v in values.items() if v is not None}}
        item["snapshots"] = [s for s in item["snapshots"] if s["date"] != day] + [snap]
        item["snapshots"].sort(key=lambda s: s["date"])

    if new.get("weeks"):
        weekly = stats.setdefault("weekly", {"source": "Buffer", "note": "", "weeks": []})
        key = lambda w: (w.get("workspace", ""), w["start"])
        by_start = {key(w): w for w in weekly["weeks"]}
        for w in new["weeks"]:
            w = {k: v for k, v in w.items() if k not in ("startDateTime", "endDateTime")}
            by_start[key(w)] = w
        weekly["weeks"] = sorted(by_start.values(), key=lambda w: w["start"])

    if new.get("posts"):
        by_id = {p["bufferId"]: p for p in stats.get("posts", [])}
        for p in new["posts"]:
            by_id[p["bufferId"]] = p
        stats["posts"] = sorted(by_id.values(), key=lambda p: (p["sentAt"], p["platform"]))

    if new.get("timeline"):
        timeline = stats.setdefault("timeline", {"source": "Buffer", "note": "", "posts": []})
        by_id = {p["id"]: p for p in timeline["posts"]}
        for p in new["timeline"]:
            by_id[p["id"]] = {k: p[k] for k in ("id", "workspace", "platform", "sentAt", "views", "text") if k in p}
        timeline["posts"] = sorted(by_id.values(), key=lambda p: p["sentAt"])

    stats["fetchedAt"] = datetime.now(PARIS).isoformat(timespec="minutes")
    STATS.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n")
    print(f"merged: {day}, {len(new.get('weeks') or [])} weeks, {len(new.get('posts') or [])} posts, {len(new.get('timeline') or [])} timeline posts")


def init():
    """One account per network of each brand in config.json; keeps the snapshots of accounts that already exist."""
    conf = json.loads((ROOT / "public/data/config.json").read_text())
    stats = json.loads(STATS.read_text()) if STATS.exists() else {"source": "Buffer", "fetchedAt": "", "posts": []}
    old = {a.get("id") or a["platform"]: a for a in stats.get("accounts", {}).get("items", [])}
    items, multi = [], len(conf["brands"]) > 1
    for b in conf["brands"]:
        for net in b["platforms"]:
            aid = f'{b["id"]}-{net}' if multi else net
            a = old.get(aid) or {"platform": net, "handle": None, "url": None, "source": "Treg", "snapshots": []}
            a.update({"id": aid, "workspace": b["id"], "platform": net})
            h = (b.get("handles") or {}).get(net)
            if h:
                a["handle"], a["url"] = h.get("handle"), h.get("url")
            items.append(a)
    stats["accounts"] = {"note": "Abonnés relevés via Treg, une fois par jour.", "items": items}
    STATS.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n")
    print(f"stats.json : {len(items)} comptes")


if __name__ == "__main__":
    {"plan": lambda: plan(), "merge": lambda: merge(sys.argv[2]), "init": lambda: init()}[sys.argv[1]]()
