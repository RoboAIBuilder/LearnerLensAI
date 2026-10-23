"""Draws the Learner Lens app icons (magnifier with a check mark) at every size a PWA needs."""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(exist_ok=True)
BLUE, WHITE = (44, 89, 204, 255), (255, 255, 255, 255)


def draw(size, maskable=False, rounded=True):
    s = 4  # supersample for smooth edges
    W = size * s
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, W, W], fill=BLUE)
    else:
        d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=BLUE)
    scale = 0.62 if maskable else 0.78        # maskable keeps the symbol inside the safe zone
    box = W * scale
    ox = oy = (W - box) / 2
    u = box / 24                               # 24-unit grid, matching the in-app logo
    stroke = int(2.2 * u)
    cstroke = int(1.8 * u)
    cx, cy, r = ox + 10.5 * u, oy + 10.5 * u, 6.5 * u
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=WHITE, width=stroke)
    d.line([ox + 15.6 * u, oy + 15.6 * u, ox + 21 * u, oy + 21 * u], fill=WHITE, width=stroke)
    for (x, y) in [(ox + 15.6 * u, oy + 15.6 * u), (ox + 21 * u, oy + 21 * u)]:
        d.ellipse([x - stroke / 2, y - stroke / 2, x + stroke / 2, y + stroke / 2], fill=WHITE)
    pts = [(ox + 8.0 * u, oy + 10.7 * u), (ox + 9.9 * u, oy + 12.6 * u), (ox + 13.1 * u, oy + 8.9 * u)]
    d.line(pts, fill=WHITE, width=cstroke, joint="curve")
    for (x, y) in pts:
        d.ellipse([x - cstroke / 2, y - cstroke / 2, x + cstroke / 2, y + cstroke / 2], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


draw(192).save(OUT / "icon-192.png")
draw(512).save(OUT / "icon-512.png")
draw(512, maskable=True).save(OUT / "icon-maskable-512.png")
draw(180, rounded=False).save(OUT / "apple-touch-icon.png")   # iOS rounds the corners itself
draw(32).save(OUT / "favicon-32.png")
print("icons written to", OUT)
