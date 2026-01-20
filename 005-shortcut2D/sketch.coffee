import { mount, signal, button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

N = 8

D = [[-2, 1], [-1, 2], [ 1, 2], [ 2, 1], [-2,-1], [-1,-2], [ 1,-2], [ 2,-1]]

echo = console.log
range = _.range

class Player

	constructor: (curr, @letters, requiredMoves) ->
		[@curr, @setCurr] = signal curr
		[@board,@setBoard] = signal @rboard()
		[@remaining, @setRemaining] = signal requiredMoves
		@history = [@curr()] 

	letter : (i, j) ->
		for idx in range D.length
			[dx, dy] = D[idx]
			[x,y] = @curr()
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
							if _.isEqual [i,j], @curr() then "background:red; color:white; text-align:center;"
							else if _.isEqual [i,j], target then "background:green; color:white; text-align:center;"
							else "background:#{base}; text-align:center;"
						td {style}, @letter i,j
			tr {},
				for i in range N+1
					td {style:"text-align:center;"}, " abcdefgh"[i]

	update : (idx) ->
		[dx, dy] = D[idx]
		[x,y] = @curr()
		xdx = x + dx
		ydy = y + dy

		if 0 <= xdx < N and 0 <= ydy < N
			@history.push @curr()
			@setCurr [xdx, ydy]
			@setBoard @rboard()
			return true
		false

	undo : () ->
		if @history.length == 0 then return false
		@setCurr @history.pop()
		@setBoard @rboard()
		true

	reached : () ->
		_.isEqual @curr(), target

	movesTaken : () ->
		@history.length - 1
		
	pathString : () ->
		path = @history.slice()
		if not _.isEqual path[path.length - 1], @curr() then path.push @curr()
		path.map(keyx).join ' '
		
	pathArray : (includeStart = true) ->
		path = @history.slice()
		if not _.isEqual path[path.length - 1], @curr() then path.push @curr()
		out = path.map(keyx)
		if includeStart then out else out.slice 1
		
	reset : (curr, requiredMoves) ->
		@setCurr curr
		@setRemaining requiredMoves
		@history = [curr]
		@setBoard @rboard()
		
	tick : () ->
		@setRemaining @remaining() - 1

	render : ->
		div {},
			@board # signal kräver en funktion
			div {style:"text-align:center;"},
				div {}, => keyx(@curr()) # signal kräver en funktion med =
				div {}, => @remaining()

keyx = ([x,y]) -> "abcdefgh"[x] + "12345678"[y]

renderMoves = (moves) ->
	# if not showResults() then return ""
	div {style:"display:flex; flex-direction:column; gap:2px; min-width:36px; text-align:center;"},
		for move in moves
			div {style:"text-align:center;"}, move

createProblem = (level) ->

	findSolution = ->
		echo 'findSolution',target
		path = [] 
		curr = keyx target
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
			target = _.sample front0
			return [start, target, findSolution()]
		else front0 = front1
		target = _.sample front1
	[start, target, findSolution()]

[level, setLevel] = signal 1
[showResults, setShowResults] = signal false
[perfectPath, setPerfectPath] = signal []

start = null
target = null
solution = ""
requiredMoves = 0
pendingLevel = null

[start,target,solution] = createProblem level()
echo "solution:", solution
requiredMoves = if solution.trim().length == 0 then 0 else solution.split(' ').length - 1

echo "#{keyx(start)} to #{keyx(target)}"
player1 = new Player start, "QWRTASDF", requiredMoves
player2 = new Player start, "YUOPHJKL", requiredMoves

startLevel = (newLevel) ->
	lvl = Math.max 1, newLevel
	[start,target,solution] = createProblem lvl
	requiredMoves = if solution.trim().length == 0 then 0 else solution.split(' ').length - 1
	setLevel lvl
	setShowResults false
	echo 'showResults',showResults()
	setPerfectPath []
	player1.reset start, requiredMoves
	player2.reset start, requiredMoves
	pressed.clear()
	echo "solution:", solution
	echo "#{keyx(start)} to #{keyx(target)}"

pressed = new Set()
players = [player1, player2]
undoMap = new Map [
	['e', player1]
	['i', player2]
]

checkEnd = () ->
	return unless player1.reached() and player2.reached()
	p1Perfect = player1.movesTaken() == requiredMoves
	p2Perfect = player2.movesTaken() == requiredMoves
	nextLevel = if p1Perfect and p2Perfect then level() + 1 else level() - 1
	pendingLevel = nextLevel
	setPerfectPath if solution.trim().length == 0 then [] else solution.split ' '
	setShowResults true
	echo 'showResults',showResults()
	nextLevel

document.addEventListener 'keydown', (e) ->
	key = e.key.toLowerCase()
	isSpace = e.code == 'Space' or key == ' '
	if showResults()
		if isSpace
			setShowResults false
			echo 'showResults',showResults()
			setPerfectPath []
			startLevel pendingLevel
		return
	return if pressed.has key
	pressed.add key
	if undoMap.has key
		player = undoMap.get(key)
		return if player.reached()
		player.undo()
		return
	for player in players
		idx = player.letters.toLowerCase().indexOf key
		if idx != -1
			return if player.reached()
			if player.update idx then player.tick()
			checkEnd()
			return

document.addEventListener 'keyup', (e) ->
	pressed.delete e.key.toLowerCase()
  
mount "app", 
	div {},
		div {style:"display:flex; gap:20px; align-items:flex-start;"},
			player1.render()
			div {style:"display:flex; flex-direction:column; align-items:center; gap:8px;"},
				div {}, => keyx(target)
				div {style:"display:flex; gap:16px;"},
					div {}, => if showResults() then renderMoves player1.pathArray(false) else "tomt"
					div {}, => if showResults() then renderMoves perfectPath() else "tomt"
					div {}, => if showResults() then renderMoves player2.pathArray(false) else "tomt"
			player2.render()
