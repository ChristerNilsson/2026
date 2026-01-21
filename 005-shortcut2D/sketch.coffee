import { mount, button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

N = 8

D = [[-2, 1], [-1, 2], [ 1, 2], [ 2, 1], [-2,-1], [-1,-2], [ 1,-2], [ 2,-1]]

echo = console.log
range = _.range

pressed = new Set()
player1 = null
player2 = null
level = 1
showResults = false
pendingLevel = null

solution = ""
requiredMoves = 0
perfectPath = []
target = null

###########################

class Player

	constructor: (@curr, @letters) ->
		@board = @rboard()
		@history = [@curr] 

	letter : (i, j) ->
		for idx in range D.length
			[dx, dy] = D[idx]
			[x,y] = @curr
			if _.isEqual [i,j], [x + dx, y + dy] then return @letters[idx]
		""

	rboard : ->
		table {style:"text-align:center;"},
			for j in range N-1,-1,-1
				tr {},
					td {style:"text-align:center;"}, "#{(j + 1) % 10}"
					for i in range N
						base = if (i + j) % 2 == 0 then "#b58863" else "#f0d9b5"
						style =
							if _.isEqual [i,j], @curr then "background:red; color:white; text-align:center;"
							else if _.isEqual [i,j], target then "background:green; color:white; text-align:center;"
							else "background:#{base}; text-align:center;"
						td {style}, @letter i,j
			tr {},
				for i in range N+1
					td {style:"text-align:center;"}, " abcdefgh"[i]

	update : (idx) ->
		if idx == 8 then return @undo()
		
		[dx, dy] = D[idx]
		[x,y] = @curr
		xdx = x + dx
		ydy = y + dy

		if 0 <= xdx < N and 0 <= ydy < N
			@history.push @curr
			@curr = [xdx, ydy]
			@board  = @rboard()

	undo : ->
		if @history.length == 0 then return
		@curr  = @history.pop()
		@board = @rboard()

	reached : -> _.isEqual @curr, target
	movesTaken : -> @history.length - 1
		
	pathArray : ->
		path = @history.slice(1)
		path.push @curr
		path.map keyx
		
	reset : (@curr) ->
		@history = [@curr]
		@board = @rboard()
		
	render : ->
		div {},
			@board
			div {style:"text-align:center; color:red;"},
				div {}, keyx(@curr)
				div {style:"color:black;"}, => requiredMoves - @history.length

keyx = ([x,y]) -> "abcdefgh"[x] + "12345678"[y]

renderMoves = (moves) ->
	div {style:"display:flex; flex-direction:column; gap:2px; min-width:36px; text-align:center;"},
		for move in moves
			div {style:"text-align:center;"}, move

renderHints = ->
	style0 = "text-align:center; padding:2px 6px;"
	style1 = style0 + "border-bottom:1px solid #999; font-weight:bold;"
	style2 = style0 + "border-bottom:1px solid #ddd;"
	div {},
		div {style:"text-align:center;"}, =>
			span {style:"color:green;"}, "#{keyx(target)}"
		table {style:"border-collapse:collapse;"},
			tr {style: style1},
				td {}, "1"
				td {}, "dx"
				td {}, "dy"
				td {}, "2"
			for i in range D.length
				tr {style: style2},
					td {}, "#{player1.letters[i]}"
					td {}, "#{D[i][0]}"
					td {}, "#{D[i][1]}"
					td {}, "#{player2.letters[i]}"
			tr {},
				td {style: style0}, "X"
				td {style: style0, colspan:2}, "undo"
				td {style: style0}, "M"
			tr {},
				td {style: style0, colspan:4}, "new : space"

createProblem = (level) ->

	findSolution = (t, reached) ->
		path = []
		curr = keyx t
		while curr != 'start'
			path.push curr
			curr = reached[curr]
		path.reverse()
		path.join ' '

	start = [_.random(0,N-1), _.random(0,N-1)]
	reached = {}
	reached[keyx start] = 'start'
	front0 = [start]
	while level > 0
		level = level - 1
		front1 = []
		for [x0,y0] in front0
			for key of D
				[dx, dy] = D[key]
				[x, y] = [x0 + dx, y0 + dy]
				if 0 <= x < N and 0 <= y < N and not reached[keyx [x,y]]
					reached[keyx [x,y]] = keyx [x0,y0]
					front1.push [x,y]
		if front1.length == 0
			t = _.sample front0
			return [start, t, findSolution(t, reached)]
		else front0 = front1
		t = _.sample front1
	[start, t, findSolution(t, reached)]

startLevel = (newLevel) ->
	lvl = Math.max 1, newLevel
	[start,t,solution] = createProblem lvl
	target  = t
	perfectPath = if solution.trim().length == 0 then [] else solution.split ' '
	requiredMoves = perfectPath.length #if solution.trim().length == 0 then 0 else solution.split(' ').length # - 1
	echo "Solution: #{solution}", "Required moves: #{requiredMoves}"
	echo 'perfectPath', perfectPath

	player1 = new Player start, "QWERASDFX" # X för undo
	player2 = new Player start, "UIOPHJKLM" # M för undo

	level = lvl
	showResults = false
	player1.reset start
	player2.reset start
	pressed.clear()

checkEnd = ->
	return unless player1.reached() and player2.reached()
	p1Perfect = player1.movesTaken() == requiredMoves
	p2Perfect = player2.movesTaken() == requiredMoves
	pendingLevel = if p1Perfect and p2Perfect then level + 1 else level - 1
	showResults = true

document.addEventListener 'keydown', (e) ->
	key = e.key.toUpperCase()
	isSpace = e.code == 'Space' or key == ' '
	if showResults
		if isSpace
			showResults = false
			perfectPath = []
			startLevel pendingLevel
		remount()
		return
	return if pressed.has key
	pressed.add key

	for player in [player1,player2]
		idx = player.letters.indexOf key
		if idx != -1
			if player.reached()
				remount()
				return
			player.update idx
			checkEnd()
			remount()
			return

document.addEventListener 'keyup', (e) -> pressed.delete e.key.toUpperCase()

remount = -> # mount som kan upprepas
	app = document.getElementById("app")
	app.replaceChildren div {},
		div {style:"display:flex; gap:20px; align-items:flex-start"},
			player1.render()
			div {style:"display:flex; flex-direction:column; align-items:center; gap:8px"},
				div {style: if not showResults then "display:flex; gap:16px" else "display:none"},
					renderHints()
				div {style: if showResults then "display:flex; gap:16px" else "display:none"},
					div {}, renderMoves player1.pathArray()
					div {}, renderMoves perfectPath
					div {}, renderMoves player2.pathArray()
			player2.render()
		
startLevel level

remount()
