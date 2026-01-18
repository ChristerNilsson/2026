import { mount, signal, button, div, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

echo = console.log 

class Player

	rboard : ->
		table {},
			for i in [0...8]
				tr {},
					for j in [0...8]
						td {}, if _.isEqual [i,j], [@x(),@y()] then "X" else "•"

	constructor: (@id) ->
		[@x, @setX] = signal 0
		[@y, @setY] = signal 0
		[@board,@setBoard] = signal @rboard()

	update : (dx,dy) ->
		xdx = @x() + dx
		ydy = @y() + dy

		if 0 <= xdx <= 7 and 0 <= ydy <= 7
			@setX xdx
			@setY ydy
			@setBoard @rboard()

	render : ->
		div {},
			@board
			div {},
				div {}, @x
				div {}, @y
				button { onclick: => @update  1, 2 }, "A"
				button { onclick: => @update  2, 1 }, "B"
				button { onclick: => @update  2,-1 }, "C"
				button { onclick: => @update  1,-2 }, "D"
				button { onclick: => @update -1, 2 }, "E"
				button { onclick: => @update -2, 1 }, "F"
				button { onclick: => @update -2,-1 }, "G"
				button { onclick: => @update -1,-2 }, "H"

player1 = new Player 1
player2 = new Player 2
  
mount "app", 
	div {},
		player1.render()
		player2.render()
