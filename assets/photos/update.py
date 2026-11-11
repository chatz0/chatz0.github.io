"""Rebuild photos.js from the image files in this folder.

Run from the repository root after adding or removing photos:
    python3 assets/photos/update.py

For each photo it makes a web-sized copy in assets/photos/web/ (at most 1200 px wide, with
the hidden camera data such as GPS location removed). Your originals are not changed and are
not published: .gitignore keeps them out of the repository. Captions, alt text and page pins
already in photos.js are kept.

Needs Pillow:  pip install pillow
"""
import json, os, re, sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Please install Pillow first: pip install pillow")

here = os.path.dirname(os.path.abspath(__file__))
web = os.path.join(here, "web")
js_path = os.path.join(here, "photos.js")
EXT = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff")
MAX = 1200

text = open(js_path, encoding="utf-8").read()
head, _, rest = text.partition("window.PHOTOS = ")
try:
    old = {p["file"]: p for p in json.loads(rest.strip().rstrip(";"))}
except (ValueError, KeyError, TypeError):
    sys.exit("photos.js is not in the expected format; fix it (or restore it with git) and run again.")

def web_name(name):
    base = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(name)[0].lower()).strip("-") or "photo"
    return base + ".jpg"

os.makedirs(web, exist_ok=True)
photos, made, kept, failed = [], 0, 0, 0
for name in sorted(os.listdir(here)):
    src = os.path.join(here, name)
    if not (os.path.isfile(src) and name.lower().endswith(EXT)):
        continue
    out = web_name(name)
    dst = os.path.join(web, out)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        try:
            im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")   # upright; drops EXIF on save
            im.thumbnail((MAX, MAX * 2))
            im.save(dst, "JPEG", quality=82, optimize=True)
            made += 1
        except Exception as e:
            print(f"  could not read {name}: {e}"); failed += 1
            continue
    else:
        kept += 1
    prev = old.get(out, {})
    w, h = Image.open(dst).size
    photos.append({"file": out, "caption": prev.get("caption", ""), "alt": prev.get("alt", ""),
                   "page": prev.get("page", ""), "width": w, "height": h})

listed = {p["file"] for p in photos}
for f in os.listdir(web):
    if f not in listed and not f.startswith('.'):
        os.remove(os.path.join(web, f))          # its original was removed

with open(js_path, "w", encoding="utf-8") as fh:
    fh.write(head + "window.PHOTOS = " + json.dumps(photos, indent=2, ensure_ascii=False) + ";\n")
print(f"{len(photos)} photo(s): {made} new or updated, {kept} unchanged" + (f", {failed} unreadable" if failed else "") + ".")
print("Now add captions in assets/photos/photos.js if you like, then commit and push.")
