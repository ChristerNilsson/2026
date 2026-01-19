import { mount, signal, button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

N = 8

D = { A: [ 1, 2], B:[ 2, 1], C:[ 2,-1], D:[ 1,-2], E:[-1, 2], F:[-2, 1], G:[-2,-1], H:[-1,-2]}

echo = console.log 
range = _.range

class Player

	constructor: (@id) ->
		[@x, @setX] = signal 1
		[@y, @setY] = signal 1
		[@board,@setBoard] = signal @rboard()
		@history = [[@x(),@y()]] 

	rboard : ->
		table {},
			for j in range N-1,-1,-1
				tr {},
					for i in range N
						td {}, if _.isEqual [i+1,j+1], [@x(),@y()] then "X" else "•"

	update : (letter) ->
		[dx, dy] = D[letter]
		xdx = @x() + dx
		ydy = @y() + dy

		if 0 < xdx < N+1 and 0 < ydy < N+1
			@history.push [@x(), @y()]
			@setX xdx
			@setY ydy
			@setBoard @rboard()

	undo : () ->
		if @history.length == 0 then return
		[x,y] = @history.pop()
		@setX x
		@setY y
		@setBoard @rboard()
		
	render : ->
		div {},
			@board # automatiskt anrop
			div {},
				div {}, @x # automatiskt anrop
				div {}, @y # automatiskt anrop
				button { onclick: => @update "A"},"A"
				button { onclick: => @update "B"},"B"
				button { onclick: => @update "C"},"C"
				button { onclick: => @update "D"},"D"
				button { onclick: => @update "E"},"E"
				button { onclick: => @update "F"},"F"
				button { onclick: => @update "G"},"G"
				button { onclick: => @update "H"},"H"
				" "
				button { onclick: => @undo() }, "undo"

player1 = new Player 1
player2 = new Player 2
  
mount "app", 
	div {style:"display:flex; gap:20px;"},
		player1.render()
		player2.render()
