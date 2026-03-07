import {render, tag} from './fasthtml.js'

echo = console.log

div = tag "div"
label = tag "label"
button = tag "button"

# z = -1
# matrix = []
# matrix.push [0,0,2,1,z,z] # g.min
# matrix.push [1,1,2,0,z,z] # g.sec
# matrix.push [2,2,6,3,z,z] 
# matrix.push [3,3,6,4,z,z] 
# matrix.push [4,4,6,5,z,z] 
# matrix.push [5,5,6,2,z,z] 
# matrix.push [z,z,2,z,8,7]
# matrix.push [z,z,z,z,8,z]
# matrix.push [z,z,z,z,z,7] # Left vann på tid
# matrix.push [z,z,z,z,z,z] # Right vann på tid

###
Specifikation: 
Med [90] menas att 90 är understruket

Startläge: [90]:30
	- [60]:30
	+ [01]:30
	A [90]:30 90:30
		- [89]:30
		+ [91]:30
		A 90:30 90:30
			L 90:30 [MM:SS] (höger tickar)
				A [MM]:SS MM:SS
			R [MM:SS] 90:30 (vänster tickar)
				A [MM]:SS MM:SS
		B 90:[30] 90:30
		L NIX
		R NIX
	B 90:[30]
		B [90]:30
	L NIX
	R NIX
###

# todo: Tillåt tre siffror för minuter. Lätt att nå över 99 minuter med vissa increment, i spelöppningen.

MINUTES = [  1,2,3,4,5,10,15,20,25,30,45,60,90]
SECONDS = [0,1,2,3,4,5,10,15,20,25,30]

# setupStep: 0 choose minutes, 1 choose increment, 2 playing
g = {}
g.state = 0
g.setupStep = 0
g.min = MINUTES.length - 1
g.sec = SECONDS.length - 1
g.leftBase = MINUTES[g.min]
g.rightBase = MINUTES[g.min]
g.leftIncr = SECONDS[g.sec]
g.rightIncr = SECONDS[g.sec]

g.leftMs = 0
g.rightMs = 0

# 0: left ticks, 1: right ticks
g.active = 0
g.paused = false
g.timerId = null
g.lastTickMs = null
g.firstFlag = null # "L" | "R" | null
g.gameOver = false
g.started = false
g.savedOnFirstA = false

g.activeField = 0 # 0:Lmin 1:Lsec 2:Rmin 3:Rsec

STORAGE_KEY = "dgt2010.timeSettings"

toInt = (value, fallback) ->
	_n = Number.parseInt(value, 10)
	if Number.isFinite(_n) then _n else fallback

ensureOption = (arr, value) ->
	return if arr.includes value
	arr.push value
	arr.sort (a, b) -> a - b

loadSettings = ->
	try
		_raw = localStorage.getItem STORAGE_KEY
		return unless _raw?
		_data = JSON.parse _raw
	catch error
		return

	_minCandidate = toInt(_data.setupMin, g.min) # lokal
	_secCandidate = toInt(_data.setupSec, g.sec) # lokal
	g.min = if _minCandidate >= 0 and _minCandidate < MINUTES.length then _minCandidate else g.min
	g.sec = if _secCandidate >= 0 and _secCandidate < SECONDS.length then _secCandidate else g.sec

	_defaultBase = MINUTES[g.min] # lokal
	_defaultIncrement = SECONDS[g.sec] # lokal
	g.leftBase = Math.max 0, toInt(_data.leftBase, _defaultBase)
	g.rightBase = Math.max 0, toInt(_data.rightBase, _defaultBase)
	g.leftIncr = ((toInt(_data.leftIncr, _defaultIncrement) % 60) + 60) % 60
	g.rightIncr = ((toInt(_data.rightIncr, _defaultIncrement) % 60) + 60) % 60

	# Make sure saved setup-compatible values are selectable after refresh.
	ensureOption MINUTES, g.leftBase
	ensureOption SECONDS, g.leftIncr
	g.min = MINUTES.indexOf g.leftBase
	g.sec = SECONDS.indexOf g.leftIncr

saveSettings = ->
	_data =
		setupMin: g.min
		setupSec: g.sec
		leftBase: g.leftBase
		rightBase: g.rightBase
		leftIncr: g.leftIncr
		rightIncr: g.rightIncr
	try
		localStorage.setItem STORAGE_KEY, JSON.stringify(_data)
	catch error
		return

nowMs = ->
	if performance? and performance.now? then performance.now() else Date.now()

toDisplaySeconds = (_totalMs) ->
	if _totalMs <= 0 then 0 else Math.ceil(_totalMs / 1000)

getParts = (totalMs) ->
	_total = toDisplaySeconds totalMs
	{
		m: Math.floor(_total / 60)
		s: _total % 60
	}

setParts = (m, s) ->
	m = Math.max 0, m
	s = ((s % 60) + 60) % 60
	((m * 60) + s) * 1000
#	if isLeft then g.leftMs = _totalMs else g.rightMs = _totalMs

resetGameClocks = ->
	g.leftMs = ((g.leftBase * 60) + g.leftIncr) * 1000
	g.rightMs = ((g.rightBase * 60) + g.rightIncr) * 1000

fieldHtml = (value, selected) ->
	_text = String(value).padStart(2, '0')
	if selected then "<span style='text-decoration:underline'>#{_text}</span>" else _text

# setButtonStates = ->
	# isRunning = setupStep is 2 and not paused
	# lockSideButtons = setupStep < 2 or paused

setSetupView = ->
	_aaText = fieldHtml MINUTES[g.min], g.state is 0
	_ddText = fieldHtml SECONDS[g.sec], g.state is 1
	clockLabel.innerHTML = "#{_aaText}:#{_ddText}"

setPlayView = ->
	_lp = getParts g.leftMs
	_rp = getParts g.rightMs
	if g.gameOver
		clockLabel.textContent = "#{String(_lp.m).padStart(2, '0')}:#{String(_lp.s).padStart(2, '0')}  #{String(_rp.m).padStart(2, '0')}:#{String(_rp.s).padStart(2, '0')}"
		return
	_mid = "#{if g.firstFlag is 'L' then '-' else ' '}#{if g.firstFlag is 'R' then '-' else ' '}"
	if g.paused
		clockLabel.innerHTML = "#{fieldHtml(_lp.m, g.activeField is 0)}:#{fieldHtml(_lp.s, g.activeField is 1)}#{_mid}#{fieldHtml(_rp.m, g.activeField is 2)}:#{fieldHtml(_rp.s, g.activeField is 3)}"
	else
		_leftTicks = g.active is 0
		_rightTicks = g.active is 1
		_leftSep = if _leftTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		_rightSep = if _rightTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		clockLabel.innerHTML = "#{fieldHtml(_lp.m, _leftTicks)}#{_leftSep}#{fieldHtml(_lp.s, _leftTicks)}#{_mid}#{fieldHtml(_rp.m, _rightTicks)}#{_rightSep}#{fieldHtml(_rp.s, _rightTicks)}"

updateView = ->
	if g.state < 2 then setSetupView() else setPlayView()

advanceClock = ->
	return unless g.setupStep is 2
	return if g.paused
	return unless g.lastTickMs?

	_now = nowMs()
	_delta = _now - g.lastTickMs
	g.lastTickMs = _now
	return if _delta <= 0

	if g.active is 0
		g.leftMs = g.leftMs - _delta
		if g.leftMs <= 0
			g.leftMs = 0
			g.gameOver = true
			g.paused = true
			g.lastTickMs = null
			g.firstFlag = null
	else
		g.rightMs = g.rightMs - _delta
		if g.rightMs <= 0
			g.rightMs = 0
			g.gameOver = true
			g.paused = true
			g.lastTickMs = null
			g.firstFlag = null

adjustActiveField = (delta) ->
	_lp = getParts g.leftMs
	_rp = getParts g.rightMs
	if g.activeField is 0
		leftBase = Math.max 0, _lp.m + delta
		g.leftMs = setParts leftBase, _lp.s
	else if g.activeField is 1
		g.leftIncr = ((_lp.s + delta) % 60 + 60) % 60
		g.leftMs = setParts _lp.m, g.leftIncr
	else if g.activeField is 2
		rightBase = Math.max 0, _rp.m + delta
		g.rightMs = setParts rightBase, _rp.s
	else if g.activeField is 3
		g.rightIncr = ((_rp.s + delta) % 60 + 60) % 60
		g.rightMs = setParts _rp.m, g.rightIncr

tick = ->
	return if g.setupStep < 2
	return if g.paused
	advanceClock()
	updateView()

startTicker = ->
	return if g.timerId?
	g.timerId = setInterval tick, 100

enterPlayFromSetup = ->
	g.setupStep = 2
	g.leftBase = MINUTES[g.min]
	g.rightBase = MINUTES[g.min]
	g.leftIncr = SECONDS[g.sec]
	g.rightIncr = SECONDS[g.sec]
	g.active = 0
	g.paused = true
	g.lastTickMs = null
	g.firstFlag = null
	g.gameOver = false
	g.started = false
	g.savedOnFirstA = false
	g.activeField = 0
	resetGameClocks()

# update = (key) ->
# 	if g.gameOver and g.setupStep is 2
# 		return

# 	if g.setupStep < 2
# 		if key is "+"
# 			if g.setupStep is 0 then g.min = (g.min + 1) % MINUTES.length
# 			else g.sec = (g.sec + 1) % SECONDS.length
# 		else if key is "-"
# 			if g.setupStep is 0 then g.min = (g.min - 1 + MINUTES.length) % MINUTES.length
# 			else g.sec = (g.sec - 1 + SECONDS.length) % SECONDS.length
# 		else if key is "B"
# 			g.setupStep = (g.setupStep + 1) % 2
# 		else if key is "A"
# 			enterPlayFromSetup()
# 			saveSettings()
# 			g.savedOnFirstA = true
# 			g.paused = true
# 			g.lastTickMs = null
# 		updateView()
# 		return

# 	if key is "L"
# 		if not g.started and g.activeField is -1
# 			g.active = 1
# 			g.started = true
# 			g.paused = false
# 			g.lastTickMs = nowMs()
# 		else if not g.paused and g.active is 0
# 			advanceClock()
# 			g.leftMs += g.leftIncr * 1000
# 			g.active = 1
# 			g.lastTickMs = nowMs()
# 	else if key is "R"
# 		if not g.started and g.activeField is -1
# 			g.active = 0
# 			g.started = true
# 			g.paused = false
# 			g.lastTickMs = nowMs()
# 		else if not g.paused and g.active is 1
# 			advanceClock()
# 			g.rightMs += g.rightIncr * 1000
# 			g.active = 0
# 			g.lastTickMs = nowMs()
# 	else if key is "A"
# 		if g.paused
# 			if not g.started
# 				g.activeField = if g.activeField is -1 then 0 else -1
# 				g.lastTickMs = null
# 			else
# 				g.paused = false
# 				g.lastTickMs = nowMs()
# 		else
# 			advanceClock()
# 			g.paused = true
# 			g.lastTickMs = null
# 			g.activeField = 0
# 	else if key is "+"
# 		if g.paused and g.activeField isnt -1
# 			adjustActiveField 1
# 	else if key is "-"
# 		if g.paused and g.activeField isnt -1
# 			adjustActiveField -1
# 	else if key is "B"
# 		if g.paused and g.activeField isnt -1
# 			g.activeField = (g.activeField + 1) % 4

# 	updateView()

# 			enterPlayFromSetup()
# 			saveSettings()
# 			g.savedOnFirstA = true
# 			g.paused = true
# 			g.lastTickMs = null


update = (key) ->
	if g.state == 0
		if key == '-' then g.min = (g.min - 1) %% MINUTES.length
		if key == '+' then g.min = (g.min + 1) %% MINUTES.length
		if key == 'A' then g.state = 2
		if key == 'B' then g.state = 1

		if key is "A"
			enterPlayFromSetup()
			saveSettings()
			g.savedOnFirstA = true
			g.paused = true
			g.lastTickMs = null

	else if g.state == 1
		if key == '-' then g.sec = (g.sec - 1) %% SECONDS.length
		if key == '+' then g.sec = (g.sec + 1) %% SECONDS.length
		if key == 'A' then g.state = 2
		if key == 'B' then g.state = 0

		if key is "A"
			enterPlayFromSetup()
			saveSettings()
			g.savedOnFirstA = true
			g.paused = true
			g.lastTickMs = null

	else if g.state == 2
		if key == '-' then g.leftBase = (g.leftBase - 1) %% 100
		if key == '+' then g.leftBase = (g.leftBase + 1) %% 100
		if key == 'A' then g.state = 6
		if key == 'B' then g.state = 3

	else if g.state == 3
		if key == '-' then g.leftIncr = (g.leftIncr - 1) %% 60
		if key == '+' then g.leftIncr = (g.leftIncr + 1) %% 60
		if key == 'A' then g.state = 6
		if key == 'B' then g.state = 4

	else if g.state == 4
		if key == '-' then g.rightBase = (g.rightBase - 1) %% 100
		if key == '+' then g.rightBase = (g.rightBase + 1) %% 100
		if key == 'A' then g.state = 6
		if key == 'B' then g.state = 5

	else if g.state == 5
		if key == '-' then g.rightIncr = (g.rightIncr - 1) %% 60
		if key == '+' then g.rightIncr = (g.rightIncr + 1) %% 60
		if key == 'A' then g.state = 6
		if key == 'B' then g.state = 2

	else if g.state == 6
		if key == 'A' then g.state = 2
		if key == 'L' then g.state = 8
		if key == 'R' then g.state = 7

	else if g.state == 7
		if key == 'L' then g.state = 8

	else if g.state == 8
		if key == 'R' then g.state = 7

	else if g.state == 9
		zz=99

	echo g.state, key, g.min, g.sec, g.leftBase, g.leftIncr, g.rightBase, g.rightIncr

	updateView()


# 	if g.gameOver and g.setupStep is 2
# 		return

# 	if g.setupStep < 2
# 		if key is "+"
# 			if g.setupStep is 0 then min = (min + 1) % MINUTES.length
# 			else sec = (sec + 1) % SECONDS.length
# 		else if key is "-"
# 			if g.setupStep is 0 then min = (min - 1 + MINUTES.length) % MINUTES.length
# 			else sec = (sec - 1 + SECONDS.length) % SECONDS.length
# 		else if key is "B"
# 			g.setupStep = (g.setupStep + 1) % 2
# 		else if key is "A"
# 			enterPlayFromSetup()
# 			saveSettings()
# 			g.savedOnFirstA = true
# 			g.paused = true
# 			g.lastTickMs = null
# 		updateView()
# 		return

# 	if key is "L"
# 		if not g.started and g.activeField is -1
# 			g.active = 1
# 			g.started = true
# 			g.paused = false
# 			g.lastTickMs = nowMs()
# 		else if not g.paused and g.active is 0
# 			advanceClock()
# 			g.leftMs += g.leftIncr * 1000
# 			g.active = 1
# 			g.lastTickMs = nowMs()
# 	else if key is "R"
# 		if not g.started and g.activeField is -1
# 			g.active = 0
# 			g.started = true
# 			g.paused = false
# 			g.lastTickMs = nowMs()
# 		else if not g.paused and g.active is 1
# 			advanceClock()
# 			g.rightMs += g.rightIncr * 1000
# 			g.active = 0
# 			g.lastTickMs = nowMs()
# 	else if key is "A"
# 		if g.paused
# 			if not g.started
# 				g.activeField = if g.activeField is -1 then 0 else -1
# 				g.lastTickMs = null
# 			else
# 				g.paused = false
# 				g.lastTickMs = nowMs()
# 		else
# 			advanceClock()
# 			g.paused = true
# 			g.lastTickMs = null
# 			g.activeField = 0
# 	else if key is "+"
# 		if g.paused and g.activeField isnt -1
# 			adjustActiveField 1
# 	else if key is "-"
# 		if g.paused and g.activeField isnt -1
# 			adjustActiveField -1
# 	else if key is "B"
# 		if g.paused and g.activeField isnt -1
# 			g.activeField = (g.activeField + 1) % 4

# 	updateView()

render document.body, div {style:{maxWidth:"24em", margin:"0 auto", padding:"1em", fontFamily:"Consolas, 'Courier New', monospace", fontSize:"4em"}},
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.0em"}},
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "-"}, "➖"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "+"}, "➕"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "A"}, "⏯️"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "B"}, "☑️"
	div {style:{display:"flex", justifyContent:"center", marginBottom:"0.1em"}},
		clockLabel = label {style:{fontSize:"2em", minWidth:"11ch", textAlign:"center", whiteSpace:"pre"}}, ""
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.3em"}},
		button {style:{width:"8.1em", fontSize:"2em"}, onclick: -> update "L"}, "\u00A0"
		button {style:{width:"8.1em", fontSize:"2em"}, onclick: -> update "R"}, "\u00A0"

startTicker()
loadSettings()
#increment = SECONDS[sec]
updateView()
