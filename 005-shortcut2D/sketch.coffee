import { mount, signal, button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

N = 8

D = { A: [ 1, 2], B:[ 2, 1], C:[ 2,-1], D:[ 1,-2], E:[-1, 2], F:[-2, 1], G:[-2,-1], H:[-1,-2]}

echo = console.log
range = _.range

class Player

	constructor: (curr) ->
		[@curr, @setCurr] = signal curr
		[@board,@setBoard] = signal @rboard()
		@history = [@curr()] 

	letter : (i, j) ->
		if _.isEqual [i,j], @curr() then return keyx @curr()
		if _.isEqual [i,j], target then return keyx target
		for key of D 
			[dx, dy] = D[key]
			[x,y] = @curr()
			if _.isEqual [i,j], [x + dx, y + dy] then return key
		"•"

	rboard : ->
		table {style:"text-align:center;"},
			for j in range N-1,-1,-1
				tr {},
					td {style:"text-align:center;"}, "#{(j + 1) % 10}"
					for i in range N
						style =
							if _.isEqual [i,j], @curr() then "background:white; color:green; text-align:center;"
							else if _.isEqual [i,j], target then "background:green; color:white; text-align:center;"
							else "text-align:center;"
						td {style}, @letter i,j
			tr {},
				for i in range N+1
					td {style:"text-align:center;"}, " abcdefgh"[i]

	update : (letter) ->
		[dx, dy] = D[letter]
		[x,y] = @curr()
		xdx = x + dx
		ydy = y + dy

		if 0 <= xdx < N and 0 <= ydy < N
			@history.push @curr()
			@setCurr [xdx, ydy]
			@setBoard @rboard()

	undo : () ->
		if @history.length == 0 then return
		@setCurr @history.pop()
		@setBoard @rboard()
		
	render : ->
		div {},
			@board # signal kräver en funktion
			div {},
				div {}, => keyx(@curr()) + " to " + keyx(target) # signal kräver en funktion med =
				for letter in "ABCDEFGH"
					do (letter) => button { onclick: => @update letter}, => letter
				" "
				button { onclick: => @undo() }, "undo"

keyx = ([x,y]) -> "abcdefgh"[x] + "12345678"[y]

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
	# echo reached
	[start, target, findSolution()]

t0 = performance.now()
[start,target,solution] = createProblem 4
t1 = performance.now()
echo "solution:", solution

performance.now()
echo 'problem created in', (t1 - t0), 's'
echo "#{keyx(start)} to #{keyx(target)}"
player1 = new Player start
player2 = new Player start
  
mount "app", 
	div {style:"display:flex; gap:20px;"},
		player1.render()
		player2.render()
