import {render, tag} from './fasthtml.js'

NAME_LEN = 21
NBSP = "\u00A0"

div = tag "div"
input = tag "input"
label = tag "label"
button = tag "button"

formatName = (name) ->
	out = name ? ""
	if out.length > NAME_LEN then out = out.slice 0, NAME_LEN
	out = out.padEnd NAME_LEN, ' '
	out.replaceAll " ", NBSP

toSortKey = (name) ->
	out = name ? ""
	if out.length > NAME_LEN then out = out.slice 0, NAME_LEN
	out.trim().toLocaleLowerCase 'sv-SE'

player = null
ins = null
del = null
playerCount = null
players = null
selectedIndex = -1

setSelectedIndex = (i) ->
	count = players.children.length
	if count == 0
		selectedIndex = -1
		return

	next = Math.max 0, Math.min i, count - 1
	for row in players.children
		row.style.background = ""

	selectedIndex = next
	row = players.children[selectedIndex]
	row.style.background = "#cfe8ff"
	row.scrollIntoView block: "nearest"

sortPlayers = (preferredRow=null) ->
	rows = Array::slice.call players.children
	rows.sort (a,b) -> a.dataset.sortKey.localeCompare b.dataset.sortKey, 'sv', sensitivity:'base'
	for row in rows
		players.appendChild row

	if rows.length == 0
		selectedIndex = -1
		return

	if preferredRow?
		i = rows.indexOf preferredRow
		if i < 0 then i = 0
		setSelectedIndex i
	else
		setSelectedIndex Math.max 0, Math.min selectedIndex, rows.length - 1

addPlayer = (name, pick=false) ->
	formatted = formatName name
	row = div
		style: "line-height:18px; padding:0 4px; cursor:default;"
		dataset: sortKey: toSortKey(name)
		formatted

	row.addEventListener "click", ->
		i = Array::indexOf.call players.children, row
		if i >= 0
			setSelectedIndex i
			players.focus()

	players.appendChild row
	sortPlayers(if pick then row else null)

removeSelected = ->
	count = players.children.length
	if count == 0 then return

	i = if selectedIndex >= 0 then selectedIndex else count - 1
	players.removeChild players.children[i]

	if players.children.length == 0
		selectedIndex = -1
		return

	setSelectedIndex Math.min i, players.children.length - 1

update = -> playerCount.textContent = "#{players.children.length}"

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

render document.body, div {},
	player = input placeholder:'FIDE id', type:"text", style:"width:80px"
	ins = button 'Insert'
	del = button 'Delete'
	playerCount = label "0"
	players = div
		tabindex: "0"
		style: "font-family:monospace; font-size:14px; width:360px; height:360px; overflow-y:auto; border:1px solid #999; white-space:pre;"

for name in initialPlayers then addPlayer name
setSelectedIndex 0
update()

ins.addEventListener 'click', ->
	addPlayer player.value, true
	player.value = ""
	player.focus()
	update()

del.addEventListener 'click', ->
	removeSelected()
	update()

players.addEventListener 'keydown', (e) ->
	if e.key == 'ArrowUp'
		e.preventDefault()
		setSelectedIndex selectedIndex - 1
	else if e.key == 'ArrowDown'
		e.preventDefault()
		setSelectedIndex selectedIndex + 1
	else if e.key == 'Insert'
		e.preventDefault()
		ins.click()
	else if e.key == 'Delete'
		e.preventDefault()
		del.click()

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