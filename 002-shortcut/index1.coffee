echo = console.log 

start = 17
target = 6

class Player
	constructor : ->
		@score = 0
		@history = [start]

	add : -> @history.push _.last(@history) + 2	
	div : -> if _.last(@history) % 2 == 0 then @history.push _.last(@history) / 2	
	mul : -> @history.push _.last(@history) * 2	
	undo: -> if @history.length > 1 then @history.pop()
	ready : -> _.last(@history) == target

while true
	start = _.random 40
	target = _.random 40
	if start != target then break

players = []
players.push new Player
players.push new Player

bindings = {
	"KeyR": { player: 0, action: "R" },
	"KeyW": { player: 0, action: "W" },
	"KeyA": { player: 0, action: "A" },
	"KeyS": { player: 0, action: "S" },
	"KeyD": { player: 0, action: "D" },

	"KeyI": { player: 1, action: "I" },
	"KeyJ": { player: 1, action: "J" },
	"KeyK": { player: 1, action: "K" },
	"KeyL": { player: 1, action: "L" },
}

isDown = new Map()		# "KeyA" -> true/false (för att undvika auto-repeat-spam)
eventQueue = []		# kö av {type, code, t, player, action}

p1ScoreEl = document.getElementById "p1Score"
p2ScoreEl = document.getElementById "p2Score"
target0 = document.getElementById "target0"
target1 = document.getElementById "target1"
current0 = document.getElementById "current0"
current1 = document.getElementById "current1"

setKeyUI = (player, action, down) ->
	id = "p#{player}-#{action}"
	el = document.getElementById id
	if !el then return
	el.classList.toggle "down", down

updateScoresUI = ->
	target0.textContent = "#{start} to #{target}"
	target1.textContent = "#{start} to #{target}"
	current0.textContent = _.last players[0].history
	current1.textContent = _.last players[1].history
	p1ScoreEl.textContent = "#{_.last players[0].history}"
	p2ScoreEl.textContent = "#{_.last players[1].history}"

# --- Event-registrering: lägg ALLT i kö ---
enqueue = (evtType, e) ->
	b = bindings[e.code]
	if !b then return

	# Hantera auto-repeat: vi vill normalt endast 1 "keydown" per nedtryckning.
	if evtType == "down"
		if e.repeat then return # skyddar mot att hålla nere en tangent och få 30 events/s
		if isDown.get e.code then return
		isDown.set e.code, true
	else if evtType == "up"
		isDown.set e.code, false

	eventQueue.push {
		type: evtType,
		code: e.code,
		t: performance.now(),
		player: b.player,
		action: b.action
	}

window.addEventListener "keydown", ((e) => 
	# För spel: undvik att webbläsaren scrollar etc (t.ex. med space/arrow om du lägger till dem).
	if bindings[e.code] then e.preventDefault()
	enqueue("down", e)),
	{ passive: false }

window.addEventListener "keyup", ((e) => 
	if (bindings[e.code]) then e.preventDefault();
	enqueue "up", e),
	{ passive: false }

# Bra att nollställa om tabben tappar fokus (annars kan "stuck keys" uppstå).
window.addEventListener "blur",  => 
	for code of isDown.keys()
		isDown.set code, false

# --- Game loop: töm kö och uppdatera spel ---
TICK_HZ = 60;
TICK_MS = 1000 / TICK_HZ;

processEvent = (ev) ->
	if ev.type == "down"
		p = players[ev.player]
		last = _.last p.history
		if players[0].ready() or players[1].ready()
			if "R" == ev.action
				while true
					start = _.random 20
					target = _.random 20
					if start != target then break
				players[0].history = [start]
				players[1].history = [start]
		else
			if "WI".includes(ev.action) then p.undo() 
			if "AJ".includes(ev.action) then p.div() #p.history.push last / 2
			if "SK".includes ev.action then p.add() #p.history.push last + 2
			if "DL".includes ev.action then p.mul() # p.history.push last * 2
		# echo ev.action
			setKeyUI ev.player, ev.action, true
	else if ev.type == "up"
		setKeyUI ev.player, ev.action, false

	# appendLog "#{ev.t.toFixed(2)}ms	P#{ev.player} #{ev.action}	#{ev.type.toUpperCase()} (#{ev.code})"

tick = ->
	# Töm hela kön varje tick (om du vill begränsa kan du ta max N per tick).
	while eventQueue.length > 0
		ev = eventQueue.shift()
		processEvent ev
	updateScoresUI()

setInterval tick, TICK_MS

updateScoresUI()
