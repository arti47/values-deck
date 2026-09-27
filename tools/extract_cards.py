#!/usr/bin/env python3
"""Extract Live Your Values card images + text from the EPUB.
Usage: python3 extract_cards.py <book.epub> [out.zip]   (default: live_your_values_cards.zip)
       python3 extract_cards.py <book.epub> --repo <repo_dir>   (writes repo_dir/data/{cards.json,cards.js,images/})
Zip layout: live_your_values_cards/{cards.json,cards.csv,cards.md,images/NN_NAME.jpg}
Stdlib only (macOS python3)."""
import csv, html, io, json, posixpath, re, sys, zipfile
from pathlib import Path

FIX = {"LOYALITY": "LOYALTY", "OPENESS": "OPENNESS"}  # source typos

def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def spine(z):
    opf = re.search(r'full-path="([^"]+)"', z.read("META-INF/container.xml").decode()).group(1)
    x = z.read(opf).decode("utf-8")
    base = posixpath.dirname(opf)
    items = dict(re.findall(r'<item[^>]*href="([^"]+)"[^>]*id="([^"]+)"', x))
    items = {v: k for k, v in items.items()}  # id -> href
    for idref in re.findall(r'<itemref[^>]*idref="([^"]+)"', x):
        if idref in items:
            yield posixpath.join(base, items[idref])

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    epub = Path(sys.argv[1]).expanduser()
    repo = None
    if len(sys.argv) > 3 and sys.argv[2] == "--repo":
        repo = Path(sys.argv[3]).expanduser()
    out = Path(sys.argv[2] if len(sys.argv) > 2 and not repo else "live_your_values_cards.zip").expanduser()
    root = out.stem
    cards, images = [], {}
    with zipfile.ZipFile(epub) as z:
        for href in spine(z):
            if "chapter" not in href:
                continue
            x = z.read(href).decode("utf-8")
            m = re.search(r'<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"', x)
            if not m:
                continue
            alt, src = html.unescape(m.group(1)).strip(), m.group(2)
            name, _, rest = alt.partition(" to ")
            name = FIX.get(name.strip(), name.strip())
            definition = ("to " + rest).strip() if rest else ""
            actions = [strip_tags(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", x, re.S)]
            n = len(cards) + 1
            slug = re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")
            img_rel = f"images/{n:02d}_{slug}{Path(src).suffix}"
            img_zip = posixpath.normpath(posixpath.join(posixpath.dirname(href), src))
            images[img_rel] = z.read(img_zip)
            cards.append({"id": n, "name": name, "definition": definition,
                          "actions": actions, "image": img_rel})

    if repo:
        d = repo / "data"; (d / "images").mkdir(parents=True, exist_ok=True)
        for rel, data in images.items():
            (d / rel).write_bytes(data)
        for c in cards:
            c["image"] = "data/" + c["image"]
        j = json.dumps(cards, indent=2, ensure_ascii=False)
        (d / "cards.json").write_text(j, encoding="utf-8")
        (d / "cards.js").write_text("// Generated from cards.json. Loaded via <script> so index.html works from file://\nwindow.CARDS = "
                                    + json.dumps(cards, ensure_ascii=False) + ";\n", encoding="utf-8")
        print(f"{len(cards)} cards, {len(images)} images -> {d.resolve()}")
        return
    js = json.dumps(cards, indent=2, ensure_ascii=False)
    buf = io.StringIO(newline="")
    w = csv.writer(buf)
    w.writerow(["id", "name", "definition", "actions", "image"])
    for c in cards:
        w.writerow([c["id"], c["name"], c["definition"], " | ".join(c["actions"]), c["image"]])
    md = ""
    for c in cards:
        md += f"## {c['id']:02d}. {c['name']}\n\n![{c['name']}]({c['image']})\n\n*{c['definition']}*\n\n"
        md += "".join(f"- {a}\n" for a in c["actions"]) + "\n"

    with zipfile.ZipFile(out, "w") as zo:
        D = zipfile.ZIP_DEFLATED
        zo.writestr(f"{root}/cards.json", js, compress_type=D)
        zo.writestr(f"{root}/cards.csv", "\ufeff" + buf.getvalue(), compress_type=D)  # BOM: Excel UTF-8
        zo.writestr(f"{root}/cards.md", md, compress_type=D)
        for rel, data in images.items():
            zo.writestr(f"{root}/{rel}", data, compress_type=zipfile.ZIP_STORED)  # JPEG: no gain
    print(f"{len(cards)} cards, {len(images)} images -> {out.resolve()}")

if __name__ == "__main__":
    main()
