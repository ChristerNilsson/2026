echo = console.log

import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

range = _.range

lines = """
From the Tournament-Database of Chess-Results https://chess-results.com,,,,,,,,,,,,,
Seniorschack Stockholm KM Klassiskt 2026 ,,,,,,,,,,,,,
Last update 13.02.2026 18:17:32,,,,,,,,,,,,,
Ranking crosstable after Round 4,,,,,,,,,,,,,
Rk.,,Name,Rtg,FED,1.Rd,2.Rd,3.Rd,4.Rd,5.Rd,Pts. ,TB1,TB2,TB3
1,,Strömbäck Henrik ,2020,SWE, 17b1,  5w1,  9b½, 10w1,  4w ,3.5,5,0,3
2,,Lindblad Tomas ,1971,SWE, 25b1, 12w1, 16b1,  8w½,  3b ,3.5,4.5,0,3
3,WFM,Berg Laachiri Susanna ,1904,SWE, 35b1, 31w1,  6b½,  9w1,  2w ,3.5,3.5,0,3
4,,Jovic Rado ,1926,SWE, 26w1, 15b1,  8w , 16w1,  1b ,3,4.5,0,3
5,,Silins Peter ,1896,SWE, 37b1,  1b0, 18w1, 17w1,  6b ,3,4,0,3
6,,Engström Stefan ,1982,SWE, 33w1, 30b1,  3w½,  7b½,  5w ,3,4,0,2
7,,Evertsson Rune ,1922,SWE, 24b½, 39w1, 32b+,  6w½,  8b ,3,3.5,0,1
8,,Hedin Gunnar ,2096,SWE, 19b1, 11w1,  4b ,  2b½,  7w ,2.5,5.5,0,2
9,,Häggvik Kjell ,1924,SWE, 22w1, 18b1,  1w½,  3b0,0,2.5,5.5,0,2
10,,Johansson Lennart B ,1946,SWE,   -½, 20b1, 13w1,  1b0, 23w ,2.5,4.5,0,2
11,,Ålgars Olle ,1901,SWE, 21w1,  8b0, 33w1, 15b½, 14w ,2.5,4.5,0,2
12,,Lundquist Leif ,1870,SWE, 27w1,  2b0, 26w1, 14b½, 13w ,2.5,4,0,2
13,,Karlsson Sven-Åke ,1852,SWE, 38w1,   -½, 10b0, 24w1, 12b ,2.5,4,0,2
14,,Kaminski Andrzej ,1929,POL, 34b1, 16w0, 25b1, 12w½, 11b ,2.5,3.5,0,2
15,,Sterner Johan ,1810,SWE, 28b1,  4w0, 31b1, 11w½, 30b ,2.5,3.5,0,2
16,,Hartzell Ove ,1841,SWE, 40w1, 14b1,  2w0,  4b0, 22w ,2,5.5,0,2
17,,Weström Hans ,1793,SWE,  1w0, 27b1, 28w1,  5b0, 29w ,2,4.5,0,2
18,,Cederfeldt Lars ,1767,SWE, 29b1,  9w0,  5b0, 35w1, 19b ,2,4,0,2
19,,Löwgren Björn ,1802,SWE,  8w0, 21b½, 22w1, 20b½, 18w ,2,4,0,1
20,,Franzén Bo ,1809,SWE, 32b½, 10w0, 39b1, 19w½, 21b ,2,3.5,0,1
21,,Razavi Abbas ,1695,SWE, 11b0, 19w½, 29w1, 32b½, 20w ,2,3.5,0,1
22,,Stolov Leonid ,1702,SWE,  9b0, 36w1, 19b0, 31w1, 16b ,2,3,0,2
23,,Viklund Dick ,1814,SWE, 39b½, 32w , 24b½, 34w1, 10b ,2,2.5,0,1
24,,Karlsson Magnus ,1729,SWE,  7w½, 29b½, 23w½, 13b0, 26w ,1.5,4.5,0,0
25,,Gustavsson Veine ,1737,SWE,  2w0, 38b1, 14w0, 27b½,0,1.5,4,0,1
26,,Johansson Christer ,1724,SWE,  4b0, 37w1, 12b0, 28w½, 24b ,1.5,3.5,0,1
27,,Sahlin Kent ,1668,SWE, 12b0, 17w0, 36b1, 25w½, 34b ,1.5,3.5,0,1
28,,Juntti Lars-Ivar ,1587,SWE, 15w0,-1, 17b0, 26b½, 33w ,1.5,3.5,0,1
29,,Ländin Bo ,1932,SWE, 18w0, 24w½, 21b0, 39w1, 17b ,1.5,3.5,0,1
30,,Pettersson Lars-Åke ,1839,SWE, 36b1,  6w0, 34b ,   -½, 15w ,1.5,2.5,0,1
31,,Koc Ali ,1500,SWE,-1,  3b0, 15w0, 22b0, 36w ,1,4.5,0,1
32,IM,Ornstein Axel ,2059,SWE, 20w½, 23b ,  7w-, 21w½, 37b ,1,4,0,0
33,,Ring Lars ,1720,SWE,  6b0, 35w1, 11b0, 37w , 28b ,1,3.5,0,1
34,,Hellman Sten ,1717,SWE, 14w0, 40b1, 30w , 23b0, 27w ,1,3.5,0,1
35,,Nilsson Christer ,1670,SWE,  3w0, 33b0, 40w1, 18b0, 38b ,1,3,0,1
36,,Lundberg Mikael ,1600,SWE, 30w0, 22b0, 27w0, 40b1, 31b ,1,3,0,1
37,,Stumpf Friedemann ,1666,SWE,  5w0, 26b0, 38w1, 33b , 32w ,1,2.5,1,1
38,,Liistamo Jouko ,1528,SWE, 13b0, 25w0, 37b0,-1, 35w ,1,2.5,0,1
39,,Jansson Arne ,1536,SWE, 23w½,  7b0, 20w0, 29b0, 40w ,0.5,4,0,0
40,,Bergström Helge ,1537,SWE, 16b0, 34w0, 35b0, 36w0, 39b ,0,2,0,0
,,,,,,,,,,,,,
You find all details to this tournament under  https://chess-results.com/tnr1316880.aspx?lan=1,,,,,,,,,,,,,
Chess-Tournament-Results-Server: Chess-Results,,,,,,,,,,,,,
""".split '\n'

class Game 
	constructor : (@opp,@col,@res) ->

class Player 
	constructor : (@id, @name, @elo, rounds) ->
		@rounds = []
		for r in rounds
			if r.includes 'b'
				arr = r.split 'b'
				@rounds.push new Game parseInt(arr[0]),'b',arr[1]
			else if r.includes 'w'
				arr = r.split 'w'
				@rounds.push new Game parseInt(arr[0]),'w',arr[1]
			else if r == '-½'
				@rounds.push new Game -1,'',r
			else if r == '-1'
				@rounds.push new Game -1,'',r
			else 
				echo 'problem',r
	score: ->
		res = 0
		for r in @rounds
			if r.res == '+' then res+=1
			if r.res == '1' then res+=1
			if r.res == '½' then res+=0.5
			if r.res == '-½' then res+=0.5
		res
	pot : ->
		res = 0
		for r in @rounds
			if r.res == '' then res+=1
		res

	skrall : ->
		res = []
		for i in range @rounds.length
			r = @rounds[i]
			eloA = @elo
			nameA = @name
			if r.opp == -1 then continue
			eloB = players[r.opp-1].elo
			nameB = players[r.opp-1].name
			if r.res == '1' and eloA < eloB
				res.push [Math.abs(eloA - eloB), i+1, nameA, nameB]
		res

	elodiff : ->
		res = []
		for i in range @rounds.length
			r = @rounds[i]
			eloA = @elo
			nameA = @name
			if r.opp == -1 then continue
			eloB = players[r.opp-1].elo
			res.push Math.abs eloA - eloB
		Math.round _.sum(res) / res.length

	drawCount : ->
		count = 0
		for r in @rounds
			if r.res == '½' then count++
		count

	wins : ->
		b = 0
		w = 0 
		for r in @rounds
			if r.res == '1' and r.col == 'b' then b+=1
			if r.res == '1' and r.col == 'w' then w+=1
		[w,b]

titleA = lines[1].split(',')[0]
titleB = lines[3].split(',')[0]

echo titleA
echo titleB

lines = lines.slice 5,45
players = []
for line in lines
	arr = line.split ','
	id = parseInt arr[0]
	name = arr[2].trim()
	elo = parseInt arr[3]
	rounds = []
	for i in range 4
		rounds.push arr[5+i].trim()
	player = new Player id,name,elo,rounds
	players.push player

draws = 0
for player in players
	draws += player.drawCount()
echo ""
echo 'Antal remier',draws/2

bs = 0
ws = 0
for player in players
	[w,b] = player.wins()
	ws += w
	bs += b
echo 'Vita vinster',ws
echo 'Svarta vinster',bs

skrallar = []
for player in players
	skrallar = skrallar.concat player.skrall()
if skrallar.length > 0
	skrallar.sort (a,b) -> a[0] - b[0]
	skrallar.reverse()
	echo ''
	echo 'Alla skrällar'
	for skrall in skrallar 
		echo "#{skrall[0]} elos: #{skrall[2]} slog #{skrall[3]} i rond #{skrall[1]}"

elodiff = []
for player in players
	elodiff.push [player.elodiff(),player.name]
elodiff.sort()
elodiff.reverse()
echo ''
echo 'Största genomsnittliga eloskillnaderna'
for [diff,name] in elodiff
	echo diff,name

