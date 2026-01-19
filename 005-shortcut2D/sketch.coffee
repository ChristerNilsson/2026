import { mount, signal, button, div, span, table, tr, td } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

N = 8

D = { A: [ 1, 2], B:[ 2, 1], C:[ 2,-1], D:[ 1,-2], E:[-1, 2], F:[-2, 1], G:[-2,-1], H:[-1,-2]}

echo = console.log 
range = _.range

class Player

	constructor: (@id) ->
		[@x, @setX] = signal 0 # a1
		[@y, @setY] = signal 0
		[@board,@setBoard] = signal @rboard()
		@history = [[@x(),@y()]] 

	rboard : ->
		table {},
			for j in range N-1,-1,-1
				tr {},
					for i in range N
						td {}, if _.isEqual [i,j], [@x(),@y()] then "X" else "•"

	update : (letter) ->
		[dx, dy] = D[letter]
		xdx = @x() + dx
		ydy = @y() + dy

		if 0 <= xdx < N and 0 <= ydy < N
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
				div {}, => @x() + 1 # div kräver en funktion med =
				div {}, => @y() + 1
				for letter in "ABCDEFGH"
					do (letter) => button { onclick: => @update letter}, => letter
				" "
				button { onclick: => @undo() }, "undo"

player1 = new Player 1
player2 = new Player 2
  
mount "app", 
	div {style:"display:flex; gap:20px;"},
		player1.render()
		player2.render()
