import { button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"
import {echo, Game} from "./game.js"

N = 8

D = [[-2, 1], [-1, 2], [ 1, 2], [ 2, 1], [-2,-1], [-1,-2], [ 1,-2], [ 2,-1]]

range = _.range

player1 = null
player2 = null
game = null

export pretty = ([x,y]) -> "abcdefgh"[x] + "12345678"[y]

export renderMoves = (moves, cpu) ->
	echo moves
	echo cpu
	div {style:"display:flex; flex-direction:column; gap:2px; min-width:36px; text-align:center;"},
		div {style:"text-align:center;"}, "#{cpu}"
		for move in moves
			div {style:"text-align:center;"}, pretty move

class Knight extends Game
	constructor : (@ops, @minimum, @medium, @maximum, @level) -> super()		
	createStart : -> [_.random(@minimum,@maximum), _.random(@minimum,@maximum)]
	pretty : (z) -> "abcdefghijklmnop"[z[0] - 1] + "#{z[1]}"
	ok : (temp) -> @minimum <= temp[0] <= @maximum and @minimum <= temp[1] <= @maximum

	remount : ->
		echo @player1.endTime, @player1.startTime
		echo @player2.endTime, @player2.startTime
		app = document.getElementById "app"
		app.replaceChildren div {},
			div {style:"display:flex; gap:20px; align-items:flex-start"},
				@player1.render()
				div {style:"display:flex; flex-direction:column; align-items:center; gap:8px"},
					div {style: if not @showResults then "display:flex; gap:16px" else "display:none"},
						@renderHints()
					div {style: if @showResults then "display:flex; gap:16px" else "display:none"},
						div {}, renderMoves [...@player1.history.slice(1), _.last @solution], @player1.total()
						div {}, renderMoves @solution, "best"
						div {}, renderMoves [...@player2.history.slice(1), _.last @solution], @player2.total()
				@player2.render()

	renderHints : ->
		style0 = "text-align:center; padding:2px 6px;"
		style1 = style0 + "border-bottom:1px solid #999; font-weight:bold;"
		style2 = style0 + "border-bottom:1px solid #ddd;"
		div {},
			div {style:"text-align:center;"}, =>
				span {style:"color:red;"}, "#{pretty(_.last @solution)}"
			table {style:"border-collapse:collapse;"},
				tr {style: style1},
					td {}, "1"
					td {}, "dx"
					td {}, "dy"
					td {}, "2"
				for i in range D.length
					tr {style: style2},
						td {}, "#{@player1.letters[i]}"
						td {}, "#{D[i][0]}"
						td {}, "#{D[i][1]}"
						td {}, "#{@player2.letters[i]}"
				tr {},
					td {style: style0}, "X"
					td {style: style0, colspan:2}, "undo"
					td {style: style0}, "M"
				tr {},
					td {style: style0, colspan:4}, "new : space"

class Player

	constructor: (@game,@letters) ->
		@curr = []
		@target = []
		@history = [@curr] 
		@board = @rboard()
		@done = false
		@startTime = 0
		@endTime = 0
		@counter = 0

	letter : (i, j) ->
		for idx in range D.length
			[dx, dy] = D[idx]
			[x,y] = @curr
			if _.isEqual [i,j], [x + dx, y + dy] then return @letters[idx]
		""

	rboard : ->

		if @curr == null then return null

		table {style:"text-align:center;"},
			for j in range N-1,-1,-1
				tr {},
					td {style:"text-align:center;"}, "#{(j + 1) % 10}"
					for i in range N
						base = if (i + j) % 2 == 0 then "#b58863" else "#f0d9b5"
						style =
							if _.isEqual [i,j], @curr then "background:green; color:white; text-align:center;"
							else if _.isEqual [i,j], @target then "background:red; color:white; text-align:center;"
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
			@counter += 1
			@history.push @curr
			@curr = [xdx, ydy]
			@board  = @rboard()

	undo : ->
		if @history.length == 0 then return
		@curr  = @history.pop()
		@board = @rboard()

	reached : -> _.isEqual @curr, @target
	movesTaken : -> @history.length - 1
		
	reset : ->
		@curr = @game.solution[0]
		@target = _.last @game.solution
		@history = [@curr]
		@board = @rboard()
		@startTime = performance.now()
		@endTime = performance.now()
		@done = false
		@counter = 0
		
	render : ->
		div {},
			@board
			div {style:"text-align:center; color:green;"},
				div {}, pretty(@curr)
				div {style:"color:black;"}, => @game.solution.length - @history.length

	checkEnd : ->
		if not @done
			@done = true
			@endTime = performance.now()

		return unless player1.reached() and player2.reached()
		echo player1.counter, @game.solution.length-1
		p1Perfect = player1.counter == @game.solution.length - 1
		p2Perfect = player2.counter == @game.solution.length - 1
		game.pendingLevel = if p1Perfect and p2Perfect then @game.level + 1 else @game.level - 1
		game.showResults = true

	total : -> "#{((@endTime - @startTime)/1000 + @counter*10).toFixed 2}"

document.addEventListener 'keydown', (e) ->
	key = e.key.toUpperCase()
	isSpace = e.code == 'Space' or key == ' '
	if game.showResults
		if isSpace
			game.showResults = false
			game.startLevel game.pendingLevel
		game.remount()
		return
	return if game.pressed.has key
	game.pressed.add key

	for player in [player1,player2]
		idx = player.letters.indexOf key
		if idx != -1
			if player.reached()
				game.remount()
				return
			player.update idx
			player.checkEnd()
			game.remount()
			return

document.addEventListener 'keyup', (e) -> game.pressed.delete e.key.toUpperCase()

game = new Knight ["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"],0,7,7,2
player1 = new Player game,"QWERASDFX" # X för undo
player2 = new Player game,"UIOPHJKLM" # M för undo

game.player1 = player1
game.player2 = player2

game.startLevel game.level
game.remount()
