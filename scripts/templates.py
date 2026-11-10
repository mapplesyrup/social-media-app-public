"""Adds or replaces a template in public/data/templates.json (the Templates screen of the app).

  python3 -I scripts/templates.py add <template.json>
  python3 -I scripts/templates.py list

A template:
{
  "id": "face-cam-3-conseils", "workspace": "<id de la marque>", "letter": "A", "name": "Face caméra · 3 conseils",
  "use": "Quand l'utiliser, en une phrase.", "format": "vertical",
  "video": "templates/face-cam-3-conseils.mp4",
  "source": {"url": "https://…", "creator": "@compte", "date": "10 nov. 2026", "stats": "12 000 vues"},
  "palette": [{"hex": "#5725FA", "label": "couleur des titres"}],
  "sections": [{"title": "Structure", "items": ["Accroche en question (0–2 s)", "…"]},
               {"title": "Style", "items": ["…"]}, {"title": "Pour le refaire", "items": ["…"]}]
}
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILE = ROOT / "public/data/templates.json"


def load():
    return json.loads(FILE.read_text()) if FILE.exists() else {"note": "", "items": []}


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["add"] and len(a) == 2:
        t = json.loads(pathlib.Path(a[1]).read_text())
        d = load()
        d["items"] = [x for x in d["items"] if x["id"] != t["id"]] + [t]
        FILE.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        print(f"template enregistré : {t['letter']} · {t['name']}")
    elif a[:1] == ["list"]:
        for t in load()["items"]:
            print(f"{t['letter']} · {t['name']} ({t['id']})")
    else:
        sys.exit(__doc__)
