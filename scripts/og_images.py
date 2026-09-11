"""Genera favicons e imagen Open Graph por defecto (1200×630) desde el retrato del hero.
Uso: python3 scripts/og_images.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE = Path(__file__).parent.parent
PUB = BASE / "public"
SRC = PUB / "assets" / "emili-godes-laboratorio.jpg"
OUT = PUB / "assets" / "og"
OUT.mkdir(parents=True, exist_ok=True)
GREEN, CREAM, BROWN = (23, 52, 30), (252, 249, 240), (120, 88, 62)


def font(size, bold=False):
    for cand in ["/System/Library/Fonts/Supplemental/Georgia Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Georgia.ttf",
                 "/Library/Fonts/Georgia.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]:
        if Path(cand).exists():
            return ImageFont.truetype(cand, size)
    return ImageFont.load_default()


def og_default():
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), CREAM)
    photo = Image.open(SRC).convert("RGB")
    photo = ImageOps.fit(photo, (H, H), centering=(0.6, 0.5))
    im.paste(photo, (W - H, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - H, H], fill=CREAM)
    d.text((70, 180), "Emili Godes", font=font(74, True), fill=GREEN)
    d.text((72, 275), "1895–1970", font=font(38), fill=(66, 72, 66))
    d.text((72, 335), "Fotògraf · Fotógrafo · Photographer", font=font(26), fill=BROWN)
    d.text((72, 540), "emili.godes.org", font=font(26), fill=GREEN)
    im.save(OUT / "default.jpg", "JPEG", quality=85, optimize=True)


def icons():
    for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        r = size * 0.19
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=GREEN)
        f = font(int(size * 0.53), True)
        d.text((size / 2, size * 0.52), "EG", font=f, fill=CREAM, anchor="mm")
        im.save(PUB / name, "PNG", optimize=True)
    Image.open(PUB / "favicon-32.png").save(PUB / "favicon.ico", sizes=[(32, 32)])
    (PUB / "favicon-32.png").unlink()


if __name__ == "__main__":
    og_default()
    icons()
    print("OK →", OUT / "default.jpg", "+ favicons")
