import {render, tag} from './fasthtml.js'
import {testReducer} from './TestReducer.js'

echo = console.log

MIN = [  1,2,3,4,5,10,15,20,25,30,45,60,90]
SEC = [0,1,2,3,4,5,10,15,20,25,30]

HELP = "https://github.com/ChristerNilsson/2026/blob/main/014-DGT-2010/readme.md"

state =
	state: [0, 0] # [phase, field]
	duo: [MIN[MIN.length - 1], SEC[SEC.length - 1]]
	quad: [MIN[MIN.length - 1], SEC[SEC.length - 1], MIN[MIN.length - 1], SEC[SEC.length - 1]]
	used: 0

[leftMin , leftSec] = state.duo
[rightMin, rightSec] = state.duo

leftMs = 0
rightMs = 0

# 0: left ticks, 1: right ticks
active = 0
paused = false
timerId = null
lastTickMs = null

a = tag "a"
button = tag "button"
div = tag "div"
clockBox = tag "div"

STORAGE_KEY = "dgt2010.timeSettings"

mystack = []

USED_POS = 0x01
USED_NEG = 0x02
USED_B = 0x04
USED_A = 0x08
USED_R = 0x10
USED_L = 0x20
USED_START = USED_L | USED_R

withUsed = (state, used, replace = false) ->
	if replace then {...state, used} else {...state, used: (state.used ? 0) | used}

hasUsed = (mask) -> (state.used & mask) isnt 0
markUsed = (mask) -> state.used = state.used | mask
# clearUsed = (mask) -> state.used = state.used & ~mask

stepOption = (options, value, delta) ->
	i = options.indexOf value
	if i < 0 then i = 0
	options[(i + delta + options.length) % options.length]

adjustStateValue = (state, delta, usedBit) ->
	phase = state.state[0]
	field = state.state[1]
	if phase is 0
		duo = [...state.duo]
		options = if field is 0 then MIN else SEC
		duo[field] = stepOption options, duo[field], delta
		withUsed {...state, duo}, usedBit
	else if phase is 1
		quad = [...state.quad]
		options = if field % 2 is 0 then MIN else SEC
		quad[field] = stepOption options, quad[field], delta
		withUsed {...state, quad}, usedBit
	else
		withUsed state, usedBit

applyA = (state) ->
	phase = state.state[0]
	if phase is 0
		replaceQuad = ((state.used ? 0) & (USED_POS | USED_NEG)) isnt 0
		quad = if replaceQuad then [state.duo[0], state.duo[1], state.duo[0], state.duo[1]] else [...state.quad]
		withUsed {...state, state:[1,0], quad}, USED_A, true
	else if phase is 1
		withUsed {...state, state:[2,0]}, USED_A, true
	else
		withUsed state, USED_A, true

applyB = (state) ->
	phase = state.state[0]
	field = state.state[1]
	if phase is 0
		withUsed {...state, state:[0, (field + 1) % 2]}, USED_B, true
	else if phase is 1
		withUsed {...state, state:[1, (field + 1) % 4]}, USED_B, true
	else
		withUsed state, USED_B, true

applyStart = (state, side) ->
	phase = state.state[0]
	if phase is 0
		duo0 = state.duo[0]
		duo1 = state.duo[1]
		quad = [duo0, duo1, duo0, duo1]
		withUsed {...state, state:[3, side], quad}, [USED_L,USED_R][side], true
	else if phase is 1
		withUsed {...state, state:[3, side]}, (if side is 0 then USED_L else USED_R), true
	else
		withUsed {...state, state:[3, side]}, (if side is 0 then USED_L else USED_R), true

reducers = 
	NEG: (state) -> adjustStateValue state, -1, USED_NEG
	POS: (state) -> adjustStateValue state, 1, USED_POS
	A: (state) -> applyA state
	B: (state) -> applyB state
	L: (state) -> applyStart state, 0
	R: (state) -> applyStart state, 1

script = """
{"state":[0,0], "duo":[90,30], "quad":[91,31,92,32], "used":0}
	STATE [0,0] DUO [90,30] QUAD [91,31,92,32] USED 0
	NEG DUO [60,30] USED 2
	POS DUO [1,30] USED 1
	A STATE [1,0] QUAD [91,31,92,32] USED 8
		NEG QUAD [90,31,92,32] USED 10
		A STATE [2,0] QUAD [91,31,92,32] USED 8
		L STATE [3,0] QUAD [91,31,92,32] USED 32
		R STATE [3,1] QUAD [91,31,92,32] USED 16
	B STATE [0,1] DUO [90,30] USED 4
		NEG DUO [90,25] USED 6
		B STATE [0,0] DUO [90,30] USED 4
	L STATE [3,0] QUAD [90,30,90,30] USED 32
	R STATE [3,1] QUAD [90,30,90,30] USED 16
"""

tester = testReducer script,reducers,mystack
console.log 'Ready!'

toInt = (value, fallback) ->
	n = Number.parseInt(value, 10)
	if Number.isFinite(n) then n else fallback

ensureOption = (arr, value) ->
	return if arr.includes value
	arr.push value
	arr.sort (a, b) -> a - b

loadSettings = ->
	try
		raw = localStorage.getItem STORAGE_KEY
		return unless raw?
		data = JSON.parse raw
	catch error
		return

	minCandidate = toInt(data.setupMin, MIN.indexOf(state.duo[0]))
	secCandidate = toInt(data.setupSec, SEC.indexOf(state.duo[1]))
	minIndex = if minCandidate >= 0 and minCandidate < MIN.length then minCandidate else MIN.indexOf(state.duo[0])
	secIndex = if secCandidate >= 0 and secCandidate < SEC.length then secCandidate else SEC.indexOf(state.duo[1])
	state.duo = [MIN[minIndex], SEC[secIndex]]
	state.quad = [state.duo[0], state.duo[1], state.duo[0], state.duo[1]]
	state.state = [0, 0]
	state.used = 0

	[min,sec] = state.duo
	# sec = state.duo[1]
	leftMin = Math.max 0, toInt(data.leftMin, min)
	rightMin = Math.max 0, toInt(data.rightMin, min)
	leftSec = ((toInt(data.leftSec, sec) % 60) + 60) % 60
	rightSec = ((toInt(data.rightSec, sec) % 60) + 60) % 60

	# Setup (duo) restored; runtime returns to setup mode.
	state.state = [0, 0]
	state.used = 0

saveSettings = ->
	ensureOption MIN, state.duo[0]
	ensureOption SEC, state.duo[1]
	data =
		setupMin: MIN.indexOf(state.duo[0])
		setupSec: SEC.indexOf(state.duo[1])
		leftMin: leftMin
		rightMin: rightMin
		leftSec: leftSec
		rightSec: rightSec
	try
		echo "Saving settings", data
		localStorage.setItem STORAGE_KEY, JSON.stringify(data)
	catch error
		return

nowMs = ->
	if performance? and performance.now? then performance.now() else Date.now()

toDisplaySeconds = (totalMs) ->
	if totalMs <= 0 then 0 else Math.ceil(totalMs / 1000)

getParts = (totalMs) ->
	total = toDisplaySeconds totalMs
	{
		m: Math.floor(total / 60)
		s: total % 60
	}

setParts = (isLeft, m, s) ->
	m = Math.max 0, m
	s = ((s % 60) + 60) % 60
	totalMs = ((m * 60) + s) * 1000
	if isLeft then leftMs = totalMs else rightMs = totalMs

resetGameClocks = ->
	leftMs = ((leftMin * 60) + leftSec) * 1000
	rightMs = ((rightMin * 60) + rightSec) * 1000

fieldHtml = (value, selected) ->
	text = String(value).padStart(2, '0')
	if selected then "<span style='text-decoration:underline'>#{text}</span>" else text

#setButtonStates = ->
	#isRunning = state.state[0] >= 2 and not paused
	#lockSideButtons = state.state[0] < 2 or paused

setSetupView = ->
	clockLeft.style.width = "16.3em"
	clockRight.style.display = "none"
	aaText = fieldHtml state.duo[0], state.state[0] is 0
	ddText = fieldHtml state.duo[1], state.state[0] is 1
	clockLeft.innerHTML = "#{aaText}:#{ddText}"

setPlayView = ->
	clockLeft.style.width = "8.1em"
	clockRight.style.display = "block"
	lp = getParts leftMs
	rp = getParts rightMs
	if state.state[0] >= 4
		clockLeft.textContent  = "#{String(lp.m).padStart(2, '0')}:#{String(lp.s).padStart(2, '0')}"
		clockRight.textContent = "#{String(rp.m).padStart(2, '0')}:#{String(rp.s).padStart(2, '0')}"
		return
	#mid = "  "
	if paused
		clockLeft.innerHTML  = "#{fieldHtml(lp.m, state.state[1] is 0)}:#{fieldHtml(lp.s, state.state[1] is 1)}"
		clockRight.innerHTML = "#{fieldHtml(rp.m, state.state[1] is 2)}:#{fieldHtml(rp.s, state.state[1] is 3)}"
	else
		leftTicks = active is 0
		rightTicks = active is 1
		leftSep = if leftTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		rightSep = if rightTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		clockLeft.innerHTML  = "#{fieldHtml(lp.m, leftTicks)}#{leftSep}#{fieldHtml(lp.s, leftTicks)}"
		clockRight.innerHTML = "#{fieldHtml(rp.m, rightTicks)}#{rightSep}#{fieldHtml(rp.s, rightTicks)}"

updateView = ->
	#setButtonStates()
	if state.state[0] < 2 then setSetupView() else setPlayView()

advanceClock = ->
	return unless state.state[0] >= 2
	return if paused
	return unless lastTickMs?

	now = nowMs()
	delta = now - lastTickMs
	lastTickMs = now
	return if delta <= 0

	if active is 0
		leftMs = leftMs - delta
		if leftMs <= 0
			leftMs = 0
			state.state[0] = 5 # right wins on time
			paused = true
			lastTickMs = null
	else
		rightMs = rightMs - delta
		if rightMs <= 0
			rightMs = 0
			state.state[0] = 4 # left wins on time
			paused = true
			lastTickMs = null

adjustActiveField = (delta) ->
	lp = getParts leftMs
	rp = getParts rightMs
	if state.state[1] is 0
		leftMin = Math.max 0, lp.m + delta
		setParts true, leftMin, lp.s
	else if state.state[1] is 1
		leftSec = ((lp.s + delta) % 60 + 60) % 60
		setParts true, lp.m, leftSec
	else if state.state[1] is 2
		rightMin = Math.max 0, rp.m + delta
		setParts false, rightMin, rp.s
	else if state.state[1] is 3
		rightSec = ((rp.s + delta) % 60 + 60) % 60
		setParts false, rp.m, rightSec
	if not hasUsed(USED_START) then saveSettings()

tick = ->
	return if state.state[0] < 2
	return if paused
	advanceClock()
	updateView()

startTicker = ->
	return if timerId?
	timerId = setInterval tick, 100

enterPlayFromSetup = (reuseSavedQuad = false) ->
	[aa,dd] = state.duo
	state.state = [2, 0]
	if reuseSavedQuad
		state.quad = [leftMin, leftSec, rightMin, rightSec]
	else
		leftMin = aa
		rightMin = aa
		leftSec = dd
		rightSec = dd
		state.quad = [aa, dd, aa, dd]
	active = 0
	paused = true
	lastTickMs = null
	state.used = 0
	resetGameClocks()

update = (key) ->
	if state.state[0] >= 4
		return

	if state.state[0] < 2
		if key is "+"
			if state.state[0] is 0 then state.duo[0] = stepOption(MIN, state.duo[0], 1)
			else state.duo[1] = stepOption(SEC, state.duo[1], 1)
			markUsed USED_POS
			saveSettings()
		else if key is "-"
			if state.state[0] is 0 then state.duo[0] = stepOption(MIN, state.duo[0], -1)
			else state.duo[1] = stepOption(SEC, state.duo[1], -1)
			markUsed USED_NEG
			saveSettings()
		else if key is "B"
			state.state[0] = (state.state[0] + 1) % 2
			markUsed USED_B
		else if key is "A"
			enterPlayFromSetup not hasUsed(USED_POS | USED_NEG)
			markUsed USED_A
			saveSettings()
			paused = true
			lastTickMs = null
		else if key is "L" or key is "R"
			# Quick-start from setup: accept duo as quad and start immediately.
			enterPlayFromSetup false
			state.state = [3, -1]
			markUsed if key is "L" then USED_L else USED_R
			paused = false
			active = if key is "L" then 1 else 0
			lastTickMs = nowMs()
		updateView()
		return

	if key is "L"
		if not hasUsed(USED_START)
			active = 1
			markUsed USED_L
			paused = false
			state.state = [3, -1]
			lastTickMs = nowMs()
		else if not paused and active is 0
			advanceClock()
			leftMs += leftSec * 1000
			active = 1
			lastTickMs = nowMs()
	else if key is "R"
		if not hasUsed(USED_START)
			active = 0
			markUsed USED_R
			paused = false
			state.state = [3, -1]
			lastTickMs = nowMs()
		else if not paused and active is 1
			advanceClock()
			rightMs += rightSec * 1000
			active = 0
			lastTickMs = nowMs()
	else if key is "A"
		if paused
			if not hasUsed(USED_START)
				state.state[1] = if state.state[1] is -1 then 0 else -1
				lastTickMs = null
			else
				paused = false
				lastTickMs = nowMs()
		else
			advanceClock()
			paused = true
			lastTickMs = null
			state.state[1] = 0
	else if key is "+"
		if paused and state.state[1] isnt -1
			adjustActiveField 1
	else if key is "-"
		if paused and state.state[1] isnt -1
			adjustActiveField -1
	else if key is "B"
		if paused and state.state[1] isnt -1
			state.state[1] = (state.state[1] + 1) % 4

	updateView()

render document.body, div {style:{maxWidth:"16em", margin:"0 auto", padding:"1em", fontFamily:"Consolas, 'Courier New', monospace", fontSize:"4em"}},
	a {href:HELP, style:{position:"absolute", top:"0.1em", left:"0.1em", textDecoration:"none"}, target:"_blank"}, "?"
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.5em"}},
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "-"}, "➖"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "+"}, "➕"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "A"}, "⏯️"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "B"}, "☑️"
	div {style:{display:"flex", justifyContent:"center", marginBottom:"0.1em"}},
		clockLeft  = clockBox {style:{fontSize:"1.5em", width:"8.1em", display:"block", textAlign:"center", whiteSpace:"pre"}}, ""
		clockRight = clockBox {style:{fontSize:"1.5em", width:"8.1em", display:"block", textAlign:"center", whiteSpace:"pre"}}, ""
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.3em"}},
		button {style:{width:"16.1em", fontSize:"2em"}, onclick: -> update "L"}, "\u00A0"
		button {style:{width:"16.1em", fontSize:"2em"}, onclick: -> update "R"}, "\u00A0"

startTicker()
loadSettings()
updateView()
