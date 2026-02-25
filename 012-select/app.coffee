import {render, tag} from './fasthtml.js'

echo = console.log
range = _.range

NAME_LEN = 21
NBSP = "\u00A0"

div = tag "div"
input = tag "input"
select = tag "select"
option = tag "option"
label = tag "label"
button = tag "button"

add = (name) -> 
	if name.length > NAME_LEN then name = name.slice 0,NAME_LEN
	name = name.padEnd NAME_LEN,' '
	option name.replaceAll " ", NBSP

render document.body, div {},
	player = input placeholder:'FIDE id', type:"text", style:"width:80px"
	ins = button 'Insert'
	del = button 'Delete'
	playerCount = label "13"

	players = select {size:20, style:"font-family: monospace; font-size: 14px; width:360px"},
		add "Gunnar Hedin"
		add "IM Axel Ornstein"
		add "Henrik Strömbäck"
		add "Stefan Engström"
		add "Tomas Lindblad"
		add "Lennart B Johansson"
		add "Bo Ländin"
		add "Andrzej Kamiński"
		add "Rado Jovic"
		add "Rune Evertsson"
		add "Kjell Häggvik"
		add "WFM Susanna Berg Laachiri"
		add "Olle Ålgars"
		add "Peter Silins"
		add "Leif Lundquist"
		add "Lars-Åke Pettersson"
		add "Sven-Åke Karlsson"
		add "Ove Hartzell"
		add "Dick Viklund"
		add "Björn Löwgren"
		add "Bo Franzén"
		add "Hans Weström"
		add "Johan Sterner"
		add "Lars Ring"
		add "Veine Gustavsson"
		add "Lars Cederfeldt"
		add "Sten Hellman"
		add "Christer Johansson"
		add "Magnus Karlsson"
		add "Leonid Stolov"
		add "Christer Nilsson"
		add "Abbas Razavi"
		add "Friedemann Stumpf"
		add "Kent Sahlin"
		add "Lars-Ivar Juntti"
		add "Helge Bergström"
		add "Arne Jansson"
		add "Jouko Liistamo"
		add "Ali Koç"
		add "Mikael Lundberg"
			
ins.addEventListener 'click', -> 
	players.add option player.value
	for i in range players.options.length
		line = players.options[i].innerText
		if line.indexOf(player.value) >= 0
			players.selectedIndex = i

	player.value = ""
	player.focus()

	update()

del.addEventListener 'click', -> 
	if players.options?.length == 0 then return 
	i = players.selectedIndex
	players.remove i
	if i >= players.options?.length then i--
	players.selectedIndex = i
	update()

update = -> playerCount.textContent = players.options?.length

update()