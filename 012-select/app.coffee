import {render, tag} from './fasthtml.js'
import {Select} from './select.js'

div = tag "div"
input = tag "input"
label = tag "label"
button = tag "button"

player = null
ins = null
del = null
playerCount = null
players = null

initialPlayers = [
	"Gunnar Hedin"
	"Axel Ornstein"
	"Henrik Strömbäck"
	"Stefan Engström"
	"Tomas Lindblad"
	"Lennart B Johansson"
	"Bo Ländin"
	"Andrzej Kamiński"
	"Rado Jovic"
	"Rune Evertsson"
	"Kjell Häggvik"
	"Susanna Berg Laachiri"
	"Olle Ålgars"
	"Peter Silins"
	"Leif Lundquist"
	"Lars-Åke Pettersson"
	"Sven-Åke Karlsson"
	"Ove Hartzell"
	"Dick Viklund"
	"Björn Löwgren"
	"Bo Franzén"
	"Hans Weström"
	"Johan Sterner"
	"Lars Ring"
	"Veine Gustavsson"
	"Lars Cederfeldt"
	"Sten Hellman"
	"Christer Johansson"
	"Magnus Karlsson"
	"Leonid Stolov"
	"Christer Nilsson"
	"Abbas Razavi"
	"Friedemann Stumpf"
	"Kent Sahlin"
	"Lars-Ivar Juntti"
	"Helge Bergström"
	"Arne Jansson"
	"Jouko Liistamo"
	"Ali Koç"
	"Mikael Lundberg"
]

players = new Select
	items: initialPlayers
	onCountChange: (count) -> playerCount?.textContent = "#{count}"

render document.body, div {},
	player = input placeholder:'FIDE id', type:"text", style:"width:80px"
	ins = button 'Insert'
	del = button 'Delete'
	playerCount = label "0"
	players.element

playerCount.textContent = "#{players.element.children.length}"
ins.addEventListener 'click', ->
	players.addPlayer player.value, true
	player.value = ""
	player.focus()

del.addEventListener 'click', ->
	players.removeSelected()

document.addEventListener 'keydown', (e) ->
	target = e.target
	inTextInput = target? and target.tagName == 'INPUT'
	if inTextInput then return

	if e.key == 'Insert'
		e.preventDefault()
		ins.click()
	else if e.key == 'Delete'
		e.preventDefault()
		del.click()

