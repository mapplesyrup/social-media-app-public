"""Your brand's settings (public/data/config.json), written by Claude during the installation.

  python3 -I scripts/config.py init "<nom de la marque>" instagram,tiktok,linkedin
        -> creates config.json, publications.json, templates.json and stats.json if they don't exist (never overwrites)
  python3 -I scripts/config.py handle instagram solene.coaching
  python3 -I scripts/config.py handle linkedin https://www.linkedin.com/in/solene-exemple/
        -> the account Treg reads the followers of (username, or profile URL for LinkedIn)
  python3 -I scripts/config.py buffer <organizationId> instagram=<channelId> tiktok=<channelId> …
        -> the Buffer channel of each network
  python3 -I scripts/config.py show
With several brands, add --brand <id> after the command (default: the first brand).
Your data files are not tracked by git: updating the app (git pull) never touches them.
"""
import json, pathlib, re, subprocess, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "public/data"
CONF = DATA / "config.json"
NETS = {"instagram", "tiktok", "youtube", "linkedin", "x"}


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip("-") or "main"


def write_new(name, data):
    p = DATA / name
    if not p.exists():
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print(f"créé : {name}")


def load():
    return json.loads(CONF.read_text())


def save(c):
    CONF.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n")


def brand(c, args):
    bid = args[args.index("--brand") + 1] if "--brand" in args else c["brands"][0]["id"]
    return next(b for b in c["brands"] if b["id"] == bid)


def refresh_stats():
    subprocess.run([sys.executable, "-I", str(ROOT / "scripts/update_stats.py"), "init"], check=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    cmd = a[0] if a else ""
    if cmd == "init" and len(a) >= 3:
        nets = [n.strip().lower() for n in a[2].split(",") if n.strip()]
        if any(n not in NETS for n in nets):
            sys.exit(f"réseaux possibles : {sorted(NETS)}")
        DATA.mkdir(parents=True, exist_ok=True)
        for d in ("videos", "covers", "templates"):
            (ROOT / "public/media" / d).mkdir(parents=True, exist_ok=True)
        if CONF.exists():
            c = load()
            if not any(b["label"] == a[1] for b in c["brands"]):
                c["brands"].append({"id": slug(a[1]), "label": a[1], "platforms": nets})
                save(c)
                print(f"marque ajoutée : {a[1]}")
        else:
            save({"brands": [{"id": slug(a[1]), "label": a[1], "platforms": nets}]})
            print("créé : config.json")
        write_new("publications.json", {"mediaBase": "media/", "items": []})
        write_new("templates.json", {"note": "Tes formats de posts, ajoutés par Claude.", "items": []})
        refresh_stats()
    elif cmd == "handle" and len(a) >= 3:
        c = load()
        b = brand(c, a)
        v = a[2]
        b.setdefault("handles", {})[a[1]] = {"handle": None if v.startswith("http") else v.lstrip("@"), "url": v if v.startswith("http") else None}
        save(c)
        refresh_stats()
    elif cmd == "buffer" and len(a) >= 3:
        c = load()
        b = brand(c, a)
        b["buffer"] = {"organizationId": a[1], "channels": dict(x.split("=", 1) for x in a[2:] if "=" in x and not x.startswith("--"))}
        save(c)
        print("canaux Buffer enregistrés")
    elif cmd == "show":
        print(CONF.read_text() if CONF.exists() else "pas encore de config.json")
    else:
        sys.exit(__doc__)
