import { button, div, span, table, tr, td, thead, tbody } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"
import {echo, Game} from "./game.js"

N = 20
N2 = 10

range = _.range

player1 = null
player2 = null
game = null

export pretty = (z) -> game.gauss z

export renderMoves = (moves, cpu) ->
	if cpu != "result" then cpu = cpu.toFixed 2
	div {style:"display:flex; flex-direction:column; gap:2px; min-width:36px; text-align:center;"},
		div {style:"text-align:center;"}, cpu
		for move in moves
			div {style:"text-align:center;"}, pretty move

class Shortcut2D extends Game
	constructor : (@ops, @cx, @cy, @size, @level) -> 
		super()
		@xmin = @cx - @size
		@xmax = @cx + @size
		@ymin = @cy - @size
		@ymax = @cy + @size

	createStart : -> [_.random(@xmin,@xmax), _.random(@ymin,@ymax)]
	pretty : (z) -> @gauss z
	ok : (temp) -> @xmin <= temp[0] <= @xmax and @ymin <= temp[1] <= @ymax

	remount : ->
		p1total = @player1.total()
		p2total = @player2.total()
		g = 1 + Math.sign p1total - p2total
		p1col = ['red','black','green'][2-g]
		p2col = ['red','black','green'][g]
		app = document.getElementById "app"
		app.replaceChildren div {},
			div {style:"display:flex; gap:20px; align-items:flex-start"},
				@player1.render()
				div {style:"display:flex; flex-direction:column; align-items:center; gap:8px"},
					div {style: if not @showResults then "display:flex; gap:16px" else "display:none"},
						@renderHints()
					div {style: if @showResults then "display:flex; gap:16px" else "display:none"},
						div {style: "color:#{p1col}"}, renderMoves [...@player1.history.slice(1), _.last @solution], p1total
						div {}, renderMoves @solution, "result"
						div {style: "color:#{p2col}"}, renderMoves [...@player2.history.slice(1), _.last @solution], p2total
				@player2.render()

	translate : (s) ->
		if s == "x1+:y" then return "+1"
		if s == "x2*:y2*" then return "*2"
		if s == "y:x" then return "swap"
		if s == "yc:x" then return "*i"
		s

	renderHints : ->
		style0 = "text-align:center; padding:2px 6px;"
		style1 = style0 + "border-bottom:1px solid #999; font-weight:bold;"
		style2 = style0 + "border-bottom:1px solid #ddd;"
		div {},
			div {style:"text-align:center;"}, "Shortcut 2D"
			div {style:"text-align:center; font-size:32px;"}, =>
				span {style:"color:red;"}, "#{pretty _.last @solution}"
			table {style:"border-collapse:collapse; margin:0 auto;"},
				tr {style: style1},
					td {}, ""
					td {}, "op"
					td {}, ""

				for i in range @ops.length
					tr {style: style2},
						td {}, "#{@player1.letters[i]}"
						td {}, @translate @ops[i]
						td {}, "#{@player2.letters[i]}"

				tr {},
					td {style: style0}, "X"
					td {style: style0, colspan:1}, "undo"
					td {style: style0}, "M"
				tr {},
					td {style: style0, colspan:3}, "new : space"

			table {style:"border-collapse:separate; border-spacing:12px 0; white-space:nowrap; margin:50px auto 0;"},
				thead {},
					tr {style: style1}, 
						td {},""
						td {},""
				tbody {},
					tr {style: "font-size:32px; color:green; text-align:center;"},
						td pretty(player1.curr)
						td pretty(player2.curr)
					tr {style: "font-size:32px; color:green; text-align:center;"},
						td {style: "color : black;"}, => @solution.length - player1.history.length
						td {style: "color : black;"}, => @solution.length - player2.history.length

	operation : (s,pos) -> # 2D
		@stack = []
		[x,y] = pos
		[sx,sy] = s.split ':'
		x1 = @calc sx,x,y
		if x1 == null then return pos
		y1 = @calc sy,x,y
		[x1,y1]

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
		return ""
		for idx in range D.length
			[dx, dy] = D[idx]
			[x,y] = @curr
			if _.isEqual [i,j], [x + dx, y + dy] then return @letters[idx]
		""

	rboard : ->

		if @curr == null then return null

		dict = {}
		for i in range @game.ops.length
			letter = @letters[i]
			op = @game.ops[i]
			pos = @game.operation op, @curr
			if op != 'y:x' or @curr[0] != @curr[1] then dict[pretty(pos)] = letter
		echo dict

		table {style:"text-align:center;"},
			for j in range N+1
				tr {},
					for i in range N+1
						letter = dict[pretty([i-N2,N2-j])]
						if _.isEqual @curr,@target then letter = null
						base = if (i + j) % 2 == 0 then "background:#b58863" else "background:#f0d9b5"
						style =
							if _.isEqual [i-N2,N2-j], @curr then "background:green; color:white; text-align:center;"
							else if _.isEqual [i-N2,N2-j], @target then "background:red; color:white; text-align:center;"
							else "#{base}; text-align:center; color:black;"
						if letter? then td {style:"background:yellow; color:black;"}, letter
						else if j==N2 then td {style}, "#{i-N2}"
						else if i==N2 then td {style}, pretty([0,N2-j])
						else td {style}, ""

	update : (idx) ->
		if idx == @letters.length - 1 then return @undo()
		[x,y] = @curr
		ops = @game.ops[idx]
		pos = @game.operation ops, @curr

		if @game.ok pos
			@counter += 1
			@history.push @curr
			@curr = pos
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

game = new Shortcut2D ["x1+:y","x2*:y2*","y:x","yc:x"], 0,0,5, 2
player1 = new Player game,"ASDFX" # X för undo
player2 = new Player game,"HJKLM" # M för undo

game.player1 = player1
game.player2 = player2

game.startLevel game.level
game.remount()
