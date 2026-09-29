#!/usr/bin/env python3
"""Regenerate og-image.png (1200x630 social preview) for airportle.club.

Uses the game's palette from style.css. Requires Pillow:
    python3 -m pip install pillow
    python3 tools/make_og_image.py
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = "#121213"
TEXT = "#ffffff"
LIGHT_GRAY = "#818384"
GREEN = "#538d4e"
YELLOW = "#b59f3b"
GRAY = "#3a3a3c"

FONT_BOLD = "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Title, letter-spaced and centered
title = "AIRPORTLE"
title_font = ImageFont.truetype(FONT_BOLD, 76)
spacing = 14
widths = [d.textlength(ch, font=title_font) for ch in title]
total = sum(widths) + spacing * (len(title) - 1)
x = (W - total) / 2
y_title = 52
for ch, w in zip(title, widths):
    d.text((x, y_title), ch, font=title_font, fill=TEXT)
    x += w + spacing

# Three sample rows, as if solving LAX
TILE, GAP = 110, 8
board_w = TILE * 3 + GAP * 2
x0 = (W - board_w) // 2
y0 = 182
tile_font = ImageFont.truetype(FONT_BOLD, 72)
rows = [
    [("A", YELLOW), ("T", GRAY), ("L", YELLOW)],
    [("L", GREEN), ("G", GRAY), ("A", YELLOW)],
    [("L", GREEN), ("A", GREEN), ("X", GREEN)],
]
for r, row in enumerate(rows):
    for c, (letter, color) in enumerate(row):
        tx = x0 + c * (TILE + GAP)
        ty = y0 + r * (TILE + GAP)
        d.rectangle([tx, ty, tx + TILE, ty + TILE], fill=color)
        d.text((tx + TILE / 2, ty + TILE / 2), letter, font=tile_font,
               fill=TEXT, anchor="mm")

# Site URL
url_font = ImageFont.truetype(FONT_REG, 30)
d.text((W / 2, 578), "airportle.club", font=url_font, fill=LIGHT_GRAY,
       anchor="mm")

img.save("og-image.png", optimize=True)
print("wrote og-image.png")
