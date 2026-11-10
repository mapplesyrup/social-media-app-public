"""Google Drive for desktop: puts a video where Buffer can download it, without any API key.

  python3 -I scripts/drive.py setup        -> finds the synced Google Drive, creates the folder « Social media app »,
                                              prints its path and whether it is shared publicly yet
  python3 -I scripts/drive.py check        -> checks that the folder is shared « Anyone with the link » (test file)
  python3 -I scripts/drive.py put <video>  -> copies the video into the folder, waits for Drive to upload it, and
                                              prints the direct download link to give Buffer

How it works: Google Drive for desktop syncs a folder of the Mac (~/Library/CloudStorage/GoogleDrive-<email>/).
Each synced file carries its Drive id in the extended attribute « com.google.drivefs.item-id#S ». A file in a folder
shared « Anyone with the link » can be downloaded at
https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t, a link Buffer accepts.
"""
import glob, json, os, shutil, subprocess, sys, time, urllib.request

FOLDER = "Social media app"
ATTR = "com.google.drivefs.item-id#S"


def drive_root():
    roots = sorted(glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*")))
    if not roots:
        sys.exit("NO_DRIVE: Google Drive pour ordinateur n'est pas installé ou pas connecté "
                 "(https://www.google.com/drive/download/).")
    for name in ("My Drive", "Mon Drive", "Mon disque"):
        p = os.path.join(roots[0], name)
        if os.path.isdir(p):
            return p
    sys.exit(f"NO_MY_DRIVE: dossier « My Drive » introuvable dans {roots[0]}")


def item_id(path):
    r = subprocess.run(["xattr", "-p", ATTR, path], capture_output=True, text=True)
    return r.stdout.strip() or None


def direct(fid):
    return f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"


def public_size(fid):
    """Size served to an anonymous visitor (None when the file is private or not uploaded yet)."""
    req = urllib.request.Request(direct(fid), method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            if "attachment" not in (r.headers.get("Content-Disposition") or ""):
                return None
            return int(r.headers.get("Content-Length") or 0)
    except Exception:
        return None


def folder():
    p = os.path.join(drive_root(), FOLDER)
    os.makedirs(p, exist_ok=True)
    return p


def wait_public(path, fid=None, timeout=900):
    size = os.path.getsize(path)
    t0 = time.time()
    while time.time() - t0 < timeout:
        fid = fid or item_id(path)
        if fid and public_size(fid) == size:
            return fid
        time.sleep(5)
    return None


def setup():
    p = folder()
    print(json.dumps({"folder": p, "folderId": item_id(p)}, ensure_ascii=False))


def check():
    p = folder()
    test = os.path.join(p, ".test-partage.txt")
    with open(test, "w") as f:
        f.write("test du partage public\n")
    fid = wait_public(test, timeout=120)
    os.remove(test)
    print(json.dumps({"shared": bool(fid)}))
    if not fid:
        sys.exit(1)


def put(src):
    p = folder()
    dst = os.path.join(p, os.path.basename(src))
    if os.path.abspath(src) != os.path.abspath(dst):
        shutil.copy2(src, dst)
    fid = wait_public(dst)
    if not fid:
        sys.exit("NOT_PUBLIC: Drive n'a pas fini l'envoi, ou le dossier n'est pas partagé « Tous les utilisateurs disposant du lien ».")
    print(json.dumps({"file": dst, "id": fid, "url": direct(fid)}, ensure_ascii=False))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "setup":
        setup()
    elif cmd == "check":
        check()
    elif cmd == "put" and len(sys.argv) > 2:
        put(sys.argv[2])
    else:
        sys.exit(__doc__)
