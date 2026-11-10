"""Adds or updates a post of the library (public/data/publications.json), so Claude never hand-edits the JSON.

  python3 -I scripts/posts.py add <post.json>          -> adds the post, or replaces the one with the same id
  python3 -I scripts/posts.py set <id> status=programmed scheduled=2026-11-12T18:00
  python3 -I scripts/posts.py list                     -> id, status, date and title of every post

A post (every field but id, title and created is optional):
{
  "id": "reel-confiance", "workspace": "main", "title": "Reprendre confiance après un burn-out",
  "created": "2026-11-10T14:00", "status": "programmed", "scheduled": "2026-11-12T18:00",
  "format": "Reel face caméra", "duration": "42 s", "avatar": false,
  "video": "videos/reel-confiance.mp4", "thumbnail": "covers/reel-confiance.jpg", "path": "/Users/…/reel-confiance.mp4",
  "driveUrl": "https://drive.usercontent.google.com/download?id=…&export=download&confirm=t",
  "landscape": false, "sources": [],
  "instagram": {"caption": "…"}, "tiktok": {"title": "…", "caption": "…"},
  "youtube": {"title": "…", "description": "…"}, "linkedin": {"text": "…"}, "x": {"text": "…"},
  "buffer": [{"platform": "instagram", "postId": "…"}]
}
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBS = ROOT / "public/data/publications.json"
DEFAULTS = {"avatar": False, "status": "todo", "format": "", "duration": "", "path": "", "video": "", "sources": []}


def load():
    return json.loads(PUBS.read_text()) if PUBS.exists() else {"mediaBase": "media/", "items": []}


def save(d):
    PUBS.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")


def add(path):
    post = {**DEFAULTS, **json.loads(pathlib.Path(path).read_text())}
    for k in ("id", "title", "created"):
        if not post.get(k):
            sys.exit(f"champ manquant : {k}")
    d = load()
    d["items"] = [p for p in d["items"] if p["id"] != post["id"]] + [post]
    save(d)
    print(f"ajouté : {post['id']}")


def set_(pid, pairs):
    d = load()
    post = next((p for p in d["items"] if p["id"] == pid), None)
    if not post:
        sys.exit(f"post introuvable : {pid}")
    for kv in pairs:
        k, v = kv.split("=", 1)
        post[k] = v
    save(d)
    print(f"modifié : {pid}")


def list_():
    for p in sorted(load()["items"], key=lambda p: p.get("created", "")):
        print(f"{p['id']:30} {p.get('status',''):11} {p.get('scheduled','') or '—':17} {p['title']}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["add"] and len(a) == 2:
        add(a[1])
    elif a[:1] == ["set"] and len(a) >= 3:
        set_(a[1], a[2:])
    elif a[:1] == ["list"]:
        list_()
    else:
        sys.exit(__doc__)
