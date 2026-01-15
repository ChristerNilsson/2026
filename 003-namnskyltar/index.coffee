import { div, mount, section, span } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

echo = console.log

TOURNAMENT = "Seniorschack KM 2026"

s = """
Gunnar Hedin;2092
Henrik Strömbäck;2010
Stefan Engström;1977
Tomas Lindblad;1977
Lennart B Johansson;1949
Bo Ländin;1947
Andrzej Kamiński;1932
Rado Jovic;1930
Rune Evertsson;1915
Kjell Häggvik;1913
WFM Susanna Berg Laachiri;1899
Olle Ålgars;1896
Peter Silins;1894
Leif Lundquist;1865
Lars-Åke Pettersson;1848
Sven-Åke Karlsson;1842
Ove Hartzell;1824
Dick Viklund;1821
Björn Löwgren;1820
Hans Weström;1798
Lars Ring;1785
Veine Gustavsson;1753
Lars Cederfeldt;1752
Sten Hellman;1729
Christer Johansson;1729
Magnus Karlsson;1724
Leonid Stolov;1695
Christer Nilsson;1694
Abbas Razavi;1688
Friedemann Stumpf;1670
Kent Sahlin;1660
Lars-Ivar Juntti;1588
Helge Bergström;1540
Jouko Liistamo;1531
Mikael Lundberg;0
"""

players = []
for player in s.split "\n"
	[name,rating] = player.split ';'
	players.push {name, rating}

makeHalf = (p,klass) ->
	div {class: "half " + klass},
		div {class: "content"}, 
			div {class: "name"}, "#{p.name} #{p.rating}"
			div {class: "tournament"}, TOURNAMENT
			div {class: "ad spread"},
				span ch for ch in "FAIRPAIR.SE"

makeBadge = (p) ->
	div {class: "badge"}, 
		makeHalf p,"bottom"
		makeHalf p,"top"

makePage = (p1, p2) ->
	section {class: "page"},
		if p1? then makeBadge p1 else ""
		if p2? then makeBadge p2 else ""

html = ""

i = 0
app = document.getElementById "app"
while i < players.length
	res = makePage players[i], players[i+1]
	app.appendChild res
	i += 2
