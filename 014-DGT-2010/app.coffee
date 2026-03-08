import {render, tag} from './fasthtml.js'
import {testReducer} from './TestReducer.js'

echo = console.log

MINUTES = [  1,2,3,4,5,10,15,20,25,30,45,60,90]
SECONDS = [0,1,2,3,4,5,10,15,20,25,30]

state =
	state: [0, 0] # [phase, field]
	duo: [MINUTES[MINUTES.length - 1], SECONDS[SECONDS.length - 1]]
	quad: [MINUTES[MINUTES.length - 1], SECONDS[SECONDS.length - 1], MINUTES[MINUTES.length - 1], SECONDS[SECONDS.length - 1]]
	used: 0

leftBaseMin = state.duo[0]
rightBaseMin = state.duo[0]
leftIncrement = state.duo[1]
rightIncrement = state.duo[1]

leftMs = 0
rightMs = 0

# 0: left ticks, 1: right ticks
RESULT_NONE = 0
RESULT_LEFT_WIN = 1
RESULT_RIGHT_WIN = 2
active = 0
paused = false
timerId = null
lastTickMs = null
resultState = RESULT_NONE

div = tag "div"
label = tag "label"
button = tag "button"

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
clearUsed = (mask) -> state.used = state.used & ~mask

stepOption = (options, value, delta) ->
	i = options.indexOf value
	if i < 0 then i = 0
	options[(i + delta + options.length) % options.length]

adjustStateValue = (state, delta, usedBit) ->
	phase = state.state[0]
	field = state.state[1]
	if phase is 0
		duo = [...state.duo]
		options = if field is 0 then MINUTES else SECONDS
		duo[field] = stepOption options, duo[field], delta
		withUsed {...state, duo}, usedBit
	else if phase is 1
		quad = [...state.quad]
		options = if field % 2 is 0 then MINUTES else SECONDS
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
	NEG: (state) -> 
		echo "NEG", state
		adjustStateValue state, -1, USED_NEG
	POS: (state) -> 
		echo "POS", state
		adjustStateValue state, 1, USED_POS
	A: (state) -> 
		echo 'A', state
		applyA state
	B: (state) -> 
		echo 'B', state
		applyB state
	L: (state) -> 
		echo 'L', state
		applyStart state, 0
	R: (state) -> 
		echo 'R', state
		applyStart state, 1

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


# todo: Tillåt tre siffror för minuter. Lätt att nå över 99 minuter med vissa increment, i spelöppningen.


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

	minCandidate = toInt(data.setupMin, MINUTES.indexOf(state.duo[0]))
	secCandidate = toInt(data.setupSec, SECONDS.indexOf(state.duo[1]))
	minIndex = if minCandidate >= 0 and minCandidate < MINUTES.length then minCandidate else MINUTES.indexOf(state.duo[0])
	secIndex = if secCandidate >= 0 and secCandidate < SECONDS.length then secCandidate else SECONDS.indexOf(state.duo[1])
	state.duo = [MINUTES[minIndex], SECONDS[secIndex]]
	state.quad = [state.duo[0], state.duo[1], state.duo[0], state.duo[1]]
	state.state = [0, 0]
	state.used = 0

	defaultBase = state.duo[0]
	defaultIncrement = state.duo[1]
	leftBaseMin = Math.max 0, toInt(data.leftBaseMin, defaultBase)
	rightBaseMin = Math.max 0, toInt(data.rightBaseMin, defaultBase)
	leftIncrement = ((toInt(data.leftIncrement, defaultIncrement) % 60) + 60) % 60
	rightIncrement = ((toInt(data.rightIncrement, defaultIncrement) % 60) + 60) % 60

	# Setup (duo) restored; runtime returns to setup mode.
	state.state = [0, 0]
	state.used = 0

saveSettings = ->
	ensureOption MINUTES, state.duo[0]
	ensureOption SECONDS, state.duo[1]
	data =
		setupMin: MINUTES.indexOf(state.duo[0])
		setupSec: SECONDS.indexOf(state.duo[1])
		leftBaseMin: leftBaseMin
		rightBaseMin: rightBaseMin
		leftIncrement: leftIncrement
		rightIncrement: rightIncrement
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
	leftMs = ((leftBaseMin * 60) + leftIncrement) * 1000
	rightMs = ((rightBaseMin * 60) + rightIncrement) * 1000

fieldHtml = (value, selected) ->
	text = String(value).padStart(2, '0')
	if selected then "<span style='text-decoration:underline'>#{text}</span>" else text

setButtonStates = ->
	isRunning = state.state[0] >= 2 and not paused
	lockSideButtons = state.state[0] < 2 or paused

setSetupView = ->
	aaText = fieldHtml state.duo[0], state.state[0] is 0
	ddText = fieldHtml state.duo[1], state.state[0] is 1
	clockLabel.innerHTML = "#{aaText}:#{ddText}"

setPlayView = ->
	lp = getParts leftMs
	rp = getParts rightMs
	if resultState isnt RESULT_NONE
		clockLabel.textContent = "#{String(lp.m).padStart(2, '0')}:#{String(lp.s).padStart(2, '0')}  #{String(rp.m).padStart(2, '0')}:#{String(rp.s).padStart(2, '0')}"
		return
	mid = "  "
	if paused
		clockLabel.innerHTML = "#{fieldHtml(lp.m, state.state[1] is 0)}:#{fieldHtml(lp.s, state.state[1] is 1)}#{mid}#{fieldHtml(rp.m, state.state[1] is 2)}:#{fieldHtml(rp.s, state.state[1] is 3)}"
	else
		leftTicks = active is 0
		rightTicks = active is 1
		leftSep = if leftTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		rightSep = if rightTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		clockLabel.innerHTML = "#{fieldHtml(lp.m, leftTicks)}#{leftSep}#{fieldHtml(lp.s, leftTicks)}#{mid}#{fieldHtml(rp.m, rightTicks)}#{rightSep}#{fieldHtml(rp.s, rightTicks)}"

updateView = ->
	setButtonStates()
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
			resultState = RESULT_RIGHT_WIN
			paused = true
			lastTickMs = null
	else
		rightMs = rightMs - delta
		if rightMs <= 0
			rightMs = 0
			resultState = RESULT_LEFT_WIN
			paused = true
			lastTickMs = null

adjustActiveField = (delta) ->
	lp = getParts leftMs
	rp = getParts rightMs
	if state.state[1] is 0
		leftBaseMin = Math.max 0, lp.m + delta
		setParts true, leftBaseMin, lp.s
	else if state.state[1] is 1
		leftIncrement = ((lp.s + delta) % 60 + 60) % 60
		setParts true, lp.m, leftIncrement
	else if state.state[1] is 2
		rightBaseMin = Math.max 0, rp.m + delta
		setParts false, rightBaseMin, rp.s
	else if state.state[1] is 3
		rightIncrement = ((rp.s + delta) % 60 + 60) % 60
		setParts false, rp.m, rightIncrement
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
	aa = state.duo[0]
	dd = state.duo[1]
	state.state = [2, 0]
	if reuseSavedQuad
		state.quad = [leftBaseMin, leftIncrement, rightBaseMin, rightIncrement]
	else
		leftBaseMin = aa
		rightBaseMin = aa
		leftIncrement = dd
		rightIncrement = dd
		state.quad = [aa, dd, aa, dd]
	active = 0
	paused = true
	lastTickMs = null
	resultState = RESULT_NONE
	state.used = 0
	resetGameClocks()

update = (key) ->
	if resultState isnt RESULT_NONE and state.state[0] >= 2
		return

	if state.state[0] < 2
		if key is "+"
			if state.state[0] is 0 then state.duo[0] = stepOption(MINUTES, state.duo[0], 1)
			else state.duo[1] = stepOption(SECONDS, state.duo[1], 1)
			markUsed USED_POS
			saveSettings()
		else if key is "-"
			if state.state[0] is 0 then state.duo[0] = stepOption(MINUTES, state.duo[0], -1)
			else state.duo[1] = stepOption(SECONDS, state.duo[1], -1)
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
			leftMs += leftIncrement * 1000
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
			rightMs += rightIncrement * 1000
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

startTicker() #
loadSettings() # 
updateView() #
