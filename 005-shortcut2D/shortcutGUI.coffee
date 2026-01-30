import { button, div, h1, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"
import {echo, Game} from "./game.js"

range = _.range

player1 = null
player2 = null
game = null

export pretty = ([x,y]) -> "#{x}"

export renderMoves = (cpu,moves) ->
	if cpu != "res" then cpu = "#{cpu.toFixed 2}"
	div {style:"display:flex; flex-direction:column; gap:2px; min-width:36px; text-align:center;"},
		div {style:"text-align:center;"}, cpu
		for move in moves
			div {style:"text-align:center;"}, pretty move

class Shortcut extends Game
	constructor :  (@ops,@minimum,@medium,@maximum,@level) -> super()
	createStart : -> @start = [_.random(@minimum, @medium), 0]
	pretty : (z) -> "#{z[0]}"
	ok : (temp) -> @minimum <= temp[0] <= @maximum
 
	remount : ->
		p1total = @player1.total()
		p2total = @player2.total()
		g = 1 + Math.sign p1total - p2total
		p1col = ['red','black','green'][2-g]
		p2col = ['red','black','green'][g]
		app = document.getElementById "app"
		app.replaceChildren div {style: "font-size: 60px; font-family: monospace"},
			div style:"text-align:center;", "Shortcut"
			div {style:"display:flex; gap:20px; align-items:flex-start"},
				if not @showResults then @player1.render()
				div {style:"display:flex; flex-direction:column; align-items:center; gap:8px"},
					div {style: if not @showResults then "display:flex; gap:16px" else "display:none"},
						@renderHints()
					div {style: if @showResults then "display:flex; gap:16px" else "display:none"},
						div {style: "color:#{p1col}"}, renderMoves p1total, [...@player1.history.slice(1), _.last @solution]
						div {}, renderMoves "res", @solution
						div {style: "color:#{p2col}"}, renderMoves p2total, [...@player2.history.slice(1), _.last @solution]
				if not @showResults then @player2.render()

	renderHints : ->
		style0 = "text-align:center; padding:10px 50px;"
		style1 = style0 + "border-bottom:1px solid #999; font-weight:bold;"
		style2 = style0 + "border-bottom:1px solid #ddd;"
		div {},
			div {style:"text-align:center;"}, =>
				span {style:"color:red;"}, "#{pretty(_.last @solution)}"
			table {style:"border-collapse:collapse;"},
				tr {style: style1},
					td {}, ""
					td {}, "op"
					td {}, ""
				for i in range 3
					tr {style: style2},
						td {}, "#{@player1.letters[i]}"
						td {}, "#{@ops[i].split(':')[0]}"
						td {}, "#{@player2.letters[i]}"
				tr {},
					td {style: style0}, "X"
					td {style: style0, colspan:1}, "undo"
					td {style: style0}, "M"
				tr {},
					td {style: style0, colspan:3}, "new : space"

	operation : (s,pos) -> # 1D
		@stack = []
		[x,y] = pos
		sx = s
		x1 = @calc(sx,x,y)
		if x1 == null then return pos
		[x1,0]

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

	update : (idx) ->
		if idx == 3 then return @undo()
		[x,y] = @curr
		ops = @game.ops
		op = _.last(ops[idx])
		xdx = null
		if "+" == op then xdx = x + 2
		if "*" == op then xdx = x * 2
		if "/" == op and x % 2 == 0 then xdx = x // 2

		if 1 <= xdx <= @game.maximum
			@counter += 1
			@history.push @curr
			@curr = [xdx, 0]
			@board  = @rboard()

	undo : ->
		if @history.length <= 1 then return
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
		p1Perfect = player1.counter == @game.solution.length - 1
		p2Perfect = player2.counter == @game.solution.length - 1
		game.pendingLevel = if p1Perfect and p2Perfect then @game.level + 1 else @game.level - 1
		game.showResults = true

	total : -> (@endTime - @startTime)/1000 + @counter*10

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

game = new Shortcut ["x2/", "x2+","x2*"], 1,20,40,3

player1 = new Player game,"ASDX" # X för undo
player2 = new Player game,"JKLM" # M för undo

game.player1 = player1
game.player2 = player2

game.startLevel game.level
game.remount()
