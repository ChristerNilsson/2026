"""Generate the four-round results sheet from the diagram's seat assignments."""
from collections import Counter
from math import cos, sin, pi
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

BASE = Path(__file__).resolve().parent
STAR = "★"
CYCLE = "ABCDEFGH"
START = STAR + CYCLE
root = ET.parse(BASE / "trippel-trekant.svg").getroot()
edges = []
for node in root:
    if node.get("id", "").startswith("station-"):
        match = re.fullmatch(r"Svart: (.). Vitt: (.).", node.get("aria-label", ""))
        assert match, "Each board must identify its black and white seats"
        edges.append(match.groups())
assert len(edges) == 9

# Player numbers identify starting seats: 1 = star, 2 = A, ..., 9 = H.
rounds = []
opponents = {n: [] for n in range(1, 10)}
pair_counts = Counter()
for round_index in range(4):
    positions = {n: STAR if seat == STAR else CYCLE[(CYCLE.index(seat) + round_index) % 8]
                 for n, seat in enumerate(START, 1)}
    occupants = {seat: n for n, seat in positions.items()}
    games = {}
    for black_seat, white_seat in edges:
        black, white_player = occupants[black_seat], occupants[white_seat]
        games[(black, "black")] = white_player
        games[(white_player, "white")] = black
        opponents[black].append(white_player)
        opponents[white_player].append(black)
        pair_counts[tuple(sorted((black, white_player)))] += 1
    assert len(games) == 18
    rounds.append({n: (positions[n], games[(n, "white")], games[(n, "black")])
                   for n in range(1, 10)})
assert len(pair_counts) == 36 and set(pair_counts.values()) == {1}
for n, others in opponents.items():
    assert sorted(others) == [other for other in range(1, 10) if other != n]

font_dir = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Sheet", str(font_dir / "arial.ttf")))
pdfmetrics.registerFont(TTFont("SheetBold", str(font_dir / "arialbd.ttf")))
width, height = landscape(A4)
pdf = canvas.Canvas(str(BASE / "trippel-trekant.pdf"), pagesize=(width, height))
pdf.setTitle("Trippel Trekant – resultat, 9 spelare, 4 ronder")
ink = HexColor("#233d55")
grid = HexColor("#aebdcb")
left, right = 32, width - 32

def text(x, y, value, size=9, font="Sheet", align="left", color=ink):
    pdf.setFillColor(color)
    if value == STAR:
        # Draw the symbol as a vector path, independent of font glyph support.
        center_x = x + {"left": size / 2, "center": 0, "right": -size / 2}[align]
        center_y = y + size * .35
        path = pdf.beginPath()
        for point in range(10):
            angle = pi / 2 + point * pi / 5
            radius = size * (.55 if point % 2 == 0 else .22)
            px = center_x + radius * cos(angle)
            py = center_y + radius * sin(angle)
            (path.moveTo if point == 0 else path.lineTo)(px, py)
        path.close()
        pdf.drawPath(path, fill=1, stroke=0)
        return
    pdf.setFont(font, size)
    getattr(pdf, {"left": "drawString", "center": "drawCentredString", "right": "drawRightString"}[align])(x, y, value)

text(left, height - 32, "Trippel Trekant - 9 SPELARE", 18, "SheetBold", color=HexColor("#000000"))
text(left, height - 49, "Tre triangelbord · fyra ronder · två samtidiga partier per rond", 9)
text(left, height - 73, "Turnering: __________________________________    Datum: ____________________", 9)

top, header, row_height = height - 80, 35, 43
fixed = [30, 118, 42, 39]
round_width = (right - left - sum(fixed)) / 4
widths = [fixed[0], fixed[1]] + [round_width] * 4 + fixed[2:]
xs = [left]
for column_width in widths:
    xs.append(xs[-1] + column_width)
bottom = top - header - 9 * row_height
pdf.setFillColor(HexColor("#e7edf3"))
pdf.rect(left, top - header, right - left, header, fill=1, stroke=0)
for row in range(9):
    if row % 2 == 0:
        pdf.setFillColor(HexColor("#f8fafc"))
        pdf.rect(left, top - header - (row + 1) * row_height, right - left, row_height, fill=1, stroke=0)
for col, title in enumerate(["Nr", "Namn", "Rond 1", "Rond 2", "Rond 3", "Rond 4", "Poäng", "KVP"]):
    x0, x1 = xs[col:col + 2]
    if 2 <= col <= 5:
        pdf.setFillColor(ink)
        pdf.roundRect(x0 + 3, top - header + 7, x1 - x0 - 6, header - 12, 3, fill=1, stroke=0)
    text((x0 + x1) / 2, top - 22, title, 10 if 2 <= col <= 5 else 9,
         "SheetBold", "center", white if 2 <= col <= 5 else ink)
pdf.setStrokeColor(grid)
pdf.setLineWidth(.5)
for x in xs:
    pdf.line(x, top, x, bottom)
for y in [top, top - header] + [top - header - i * row_height for i in range(1, 10)]:
    pdf.line(left, y, right, y)
pdf.setStrokeColor(ink)
pdf.setLineWidth(.8)
for x in [xs[0], *xs[2:7], xs[-1]]:
    pdf.line(x, top, x, bottom)
for n in range(1, 10):
    row_top = top - header - (n - 1) * row_height
    text((xs[0] + xs[1]) / 2, row_top - 26, str(n), 12, "SheetBold", "center")
    for round_index in range(4):
        seat, white_opponent, black_opponent = rounds[round_index][n]
        x0, x1 = xs[round_index + 2:round_index + 4]
        text(x0 + 6, row_top - 14, str(black_opponent), 9)
        text((x0 + x1) / 2, row_top - 14, seat, 11, "SheetBold", "center")
        text(x1 - 6, row_top - 14, str(white_opponent), 9, align="right")
text(left, bottom - 19, "Varje ruta: position och två motståndarnummer. Skriv resultaten i den tomma ytan.", 8)
text(left, bottom - 34, "Vänstra numret: motståndare när du har svart. Högra numret: motståndare när du har vit.", 8)
text(left, bottom - 49, "Startplatser: 1 = stjärna, 2–9 = A–H. Stjärnan sitter still. Övriga flyttar A → B → C → D → E → F → G → H → A.", 8)
pdf.showPage()
pdf.save()
print("Resultatblad skapat: 4 ronder, 36 unika möten, 8 olika motståndare per spelare.")
