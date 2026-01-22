import { div, mount, section, span } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

echo = console.log

TOURNAMENT = "Seniorschack KM 2026"

s = """
 2092 Gunnar Hedin
 2062 IM Axel Ornstein
 2010 Henrik Strömbäck
 1977 Stefan Engström
 1977 Tomas Lindblad
 1949 Lennart B Johansson
 1947 Bo Ländin
 1932 Andrzej Kamiński
 1930 Rado Jovic
 1915 Rune Evertsson
 1913 Kjell Häggvik
 1899 WFM Susanna Berg Laachiri
 1896 Olle Ålgars
 1894 Peter Silins
 1865 Leif Lundquist
 1848 Lars-Åke Pettersson
 1842 Sven-Åke Karlsson
 1838 Johan Sterner
 1824 Ove Hartzell
 1821 Dick Viklund
 1820 Björn Löwgren
 1806 Bo Franzén
 1798 Hans Weström
 1785 Lars Ring
 1753 Veine Gustavsson
 1752 Lars Cederfeldt
 1729 Sten Hellman
 1729 Christer Johansson
 1724 Magnus Karlsson
 1695 Leonid Stolov
 1694 Christer Nilsson
 1688 Abbas Razavi
 1670 Friedemann Stumpf
 1660 Kent Sahlin
 1588 Lars-Ivar Juntti
 1540 Helge Bergström
 1539 Arne Jansson
 1531 Jouko Liistamo
 0 Ali Koc
 0 Mikael Lundberg
"""

players = []
for player in s.split "\n"
	p = player.indexOf ' '
	rating = player.slice 0, p
	name = player.slice p
	players.push {name, rating}

makeRect = (p, i, flip) ->
	klass = if flip then "rect flip" else "rect"
	if not p? then return div class: klass
	div class: klass,
		div class: "content",
			div class: "tournament", 
				span {class: "index"},"#{i+1}"
				span TOURNAMENT
			div {class: "name"},
				span "#{p.name} #{p.rating}"
			div class: "ad spread",
				span ch for ch in "FAIRPAIR.SE"

makeBadge = (players, i) ->
	p = players[i]
	if not p? then return ""
	div class: "badge",
		makeRect p, i, true
		makeRect p, i, false

makePage = (players, i1, i2) ->
	section class: "page",
		makeBadge players, i1
		makeBadge players, i2

html = ""

i = 0
app = document.getElementById "app"
while i < players.length
	res = makePage players, i, i+1
	app.appendChild res
	i += 2
