import {render, tag} from './fasthtml.js'
# import {Select} from './select.js'
# echo = console.log

div = tag "div"
input = tag "input"
button = tag "button"

# https://svelte.dev/playground/d890871e83244a1ab60653d2e0c84cc3?version=5.53.5

render document.body, div {},
	a = input type:"number", value: 2
	div button {onclick: -> b.value = parseInt(b.value) + parseInt a.value}, "incr"
	div button {onclick: -> b.value = parseInt(b.value) - parseInt a.value}, "decr"
	b = input type:"number", value: 0




# player = null
# ins = null
# del = null
# clear = null
#incr = null
#playerCount = null
# players = null

# initialPlayers = [
# 	"Gunnar Hedin"
# 	"Axel Ornstein"
# 	"Henrik Strömbäck"
# 	"Stefan Engström"
# 	"Tomas Lindblad"
# 	"Lennart B Johansson"
# 	"Bo Ländin"
# 	"Andrzej Kamiński"
# 	"Rado Jovic"
# 	"Rune Evertsson"
# 	"Kjell Häggvik"
# 	"Susanna Berg Laachiri"
# 	"Olle Ålgars"
# 	"Peter Silins"
# 	"Leif Lundquist"
# 	"Lars-Åke Pettersson"
# 	"Sven-Åke Karlsson"
# 	"Ove Hartzell"
# 	"Dick Viklund"
# 	"Björn Löwgren"
# 	"Bo Franzén"
# 	"Hans Weström"
# 	"Johan Sterner"
# 	"Lars Ring"
# 	"Veine Gustavsson"
# 	"Lars Cederfeldt"
# 	"Sten Hellman"
# 	"Christer Johansson"
# 	"Magnus Karlsson"
# 	"Leonid Stolov"
# 	"Christer Nilsson"
# 	"Abbas Razavi"
# 	"Friedemann Stumpf"
# 	"Kent Sahlin"
# 	"Lars-Ivar Juntti"
# 	"Helge Bergström"
# 	"Arne Jansson"
# 	"Jouko Liistamo"
# 	"Ali Koç"
# 	"Mikael Lundberg"
# ]

# players = new Select
# 	items: initialPlayers
# 	onCountChange: (count) -> playerCount?.textContent = count





# <script>
# 	let min = 10;
# 	let max = 24;
# 	let increment = 2;
# 	$: value = Math.max(min, Math.min(max, value ?? min));
# </script>

# <style>
# 	button,
# 	input {
# 		width: 3em
# 	}
# 	button {
# 		font-weight: bold
# 	}
# </style>

# <input type=number bind:value={min} />
# <input type=number bind:value={max} />
# <input type=number bind:value={increment} />
# <br/>

# <button disabled='{value <= min}' on:click={() => value -= increment}>-</button>
# <input type=number min max bind:value />
# <button disabled='{value >= max}' on:click={() => value += increment}>+</button>




# playerCount.textContent = "#{players.element.children.length}"
# ins.addEventListener 'click', ->
# 	players.addPlayer player.value, true
# 	player.value = ""
# 	player.focus()

# player.addEventListener 'keydown', (e) ->
# 	if e.key == 'Enter'
# 		e.preventDefault()
# 		ins.click()

# del.addEventListener 'click', ->
# 	players.removeSelected()

# clear.addEventListener 'click', ->
# 	players.clear()

# incr.addEventListener 'click', -> playerCount.textContent = "#{parseInt(playerCount.textContent) + 1}"

# document.addEventListener 'keydown', (e) ->
# 	target = e.target
# 	inTextInput = target? and target.tagName == 'INPUT'
# 	if inTextInput then return

# 	if e.key == 'Insert'
# 		e.preventDefault()
# 		ins.click()
# 	else if e.key == 'Delete'
# 		e.preventDefault()
# 		del.click()