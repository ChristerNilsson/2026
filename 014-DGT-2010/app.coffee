import {render, tag} from './fasthtml.js'

MINUTES = [  1,2,3,4,5,10,15,20,25,30,45,60,90]
SECONDS = [0,1,2,3,4,5,10,15,20,25,30]

# setupStep: 0 choose minutes, 1 choose increment, 2 playing
setupStep = 0
min = MINUTES.length - 1
sec = SECONDS.length - 1
increment = SECONDS[sec]
leftBaseMin = MINUTES[min]
rightBaseMin = MINUTES[min]
leftIncrement = increment
rightIncrement = increment

leftMs = 0
rightMs = 0

# 0: left ticks, 1: right ticks
active = 0
paused = false
timerId = null
lastTickMs = null
firstFlag = null # "L" | "R" | null
gameOver = false
started = false
savedOnFirstA = false

activeField = 0 # 0:Lmin 1:Lsec 2:Rmin 3:Rsec

div = tag "div"
label = tag "label"
button = tag "button"

STORAGE_KEY = "dgt2010.timeSettings"

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

	minCandidate = toInt(data.setupMin, min)
	secCandidate = toInt(data.setupSec, sec)
	min = if minCandidate >= 0 and minCandidate < MINUTES.length then minCandidate else min
	sec = if secCandidate >= 0 and secCandidate < SECONDS.length then secCandidate else sec

	defaultBase = MINUTES[min]
	defaultIncrement = SECONDS[sec]
	leftBaseMin = Math.max 0, toInt(data.leftBaseMin, defaultBase)
	rightBaseMin = Math.max 0, toInt(data.rightBaseMin, defaultBase)
	leftIncrement = ((toInt(data.leftIncrement, defaultIncrement) % 60) + 60) % 60
	rightIncrement = ((toInt(data.rightIncrement, defaultIncrement) % 60) + 60) % 60

	# Make sure saved setup-compatible values are selectable after refresh.
	ensureOption MINUTES, leftBaseMin
	ensureOption SECONDS, leftIncrement
	min = MINUTES.indexOf leftBaseMin
	sec = SECONDS.indexOf leftIncrement

saveSettings = ->
	data =
		setupMin: min
		setupSec: sec
		leftBaseMin: leftBaseMin
		rightBaseMin: rightBaseMin
		leftIncrement: leftIncrement
		rightIncrement: rightIncrement
	try
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
	isRunning = setupStep is 2 and not paused
	lockSideButtons = setupStep < 2 or paused

setSetupView = ->
	aaText = fieldHtml MINUTES[min], setupStep is 0
	ddText = fieldHtml SECONDS[sec], setupStep is 1
	clockLabel.innerHTML = "#{aaText}:#{ddText}"

setPlayView = ->
	lp = getParts leftMs
	rp = getParts rightMs
	if gameOver
		clockLabel.textContent = "#{String(lp.m).padStart(2, '0')}:#{String(lp.s).padStart(2, '0')}  #{String(rp.m).padStart(2, '0')}:#{String(rp.s).padStart(2, '0')}"
		return
	mid = "#{if firstFlag is 'L' then '-' else ' '}#{if firstFlag is 'R' then '-' else ' '}"
	if paused
		if not started
			clockLabel.textContent = "#{String(lp.m).padStart(2, '0')}:#{String(lp.s).padStart(2, '0')}#{mid}#{String(rp.m).padStart(2, '0')}:#{String(rp.s).padStart(2, '0')}"
		else
			clockLabel.innerHTML = "#{fieldHtml(lp.m, activeField is 0)}:#{fieldHtml(lp.s, activeField is 1)}#{mid}#{fieldHtml(rp.m, activeField is 2)}:#{fieldHtml(rp.s, activeField is 3)}"
	else
		leftTicks = active is 0
		rightTicks = active is 1
		leftSep = if leftTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		rightSep = if rightTicks then "<span style='text-decoration:underline'>:</span>" else ":"
		clockLabel.innerHTML = "#{fieldHtml(lp.m, leftTicks)}#{leftSep}#{fieldHtml(lp.s, leftTicks)}#{mid}#{fieldHtml(rp.m, rightTicks)}#{rightSep}#{fieldHtml(rp.s, rightTicks)}"

updateView = ->
	setButtonStates()
	if setupStep < 2 then setSetupView() else setPlayView()

advanceClock = ->
	return unless setupStep is 2
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
			gameOver = true
			paused = true
			lastTickMs = null
			firstFlag = null
	else
		rightMs = rightMs - delta
		if rightMs <= 0
			rightMs = 0
			gameOver = true
			paused = true
			lastTickMs = null
			firstFlag = null

adjustActiveField = (delta) ->
	lp = getParts leftMs
	rp = getParts rightMs
	if activeField is 0
		leftBaseMin = Math.max 0, lp.m + delta
		setParts true, leftBaseMin, lp.s
	else if activeField is 1
		leftIncrement = ((lp.s + delta) % 60 + 60) % 60
		setParts true, lp.m, leftIncrement
	else if activeField is 2
		rightBaseMin = Math.max 0, rp.m + delta
		setParts false, rightBaseMin, rp.s
	else if activeField is 3
		rightIncrement = ((rp.s + delta) % 60 + 60) % 60
		setParts false, rp.m, rightIncrement

tick = ->
	return if setupStep < 2
	return if paused
	advanceClock()
	updateView()

startTicker = ->
	return if timerId?
	timerId = setInterval tick, 100

enterPlayFromSetup = ->
	aa = MINUTES[min]
	dd = SECONDS[sec]
	setupStep = 2
	increment = dd
	leftBaseMin = aa
	rightBaseMin = aa
	leftIncrement = dd
	rightIncrement = dd
	active = 0
	paused = true
	lastTickMs = null
	firstFlag = null
	gameOver = false
	started = false
	savedOnFirstA = false
	activeField = 0
	resetGameClocks()

update = (key) ->
	if gameOver and setupStep is 2
		return

	if setupStep < 2
		if key is "+"
			if setupStep is 0 then min = (min + 1) % MINUTES.length
			else sec = (sec + 1) % SECONDS.length
		else if key is "-"
			if setupStep is 0 then min = (min - 1 + MINUTES.length) % MINUTES.length
			else sec = (sec - 1 + SECONDS.length) % SECONDS.length
		else if key is "B"
			if setupStep is 0
				setupStep = 1
			else
				enterPlayFromSetup()
		else if key is "A"
			enterPlayFromSetup()
			saveSettings()
			savedOnFirstA = true
			paused = true
			lastTickMs = null
		updateView()
		return

	if key is "L"
		if not started
			active = 1
			started = true
			paused = false
			lastTickMs = nowMs()
		else if not paused and active is 0
			advanceClock()
			leftMs += leftIncrement * 1000
			active = 1
			lastTickMs = nowMs()
	else if key is "R"
		if not started
			active = 0
			started = true
			paused = false
			lastTickMs = nowMs()
		else if not paused and active is 1
			advanceClock()
			rightMs += rightIncrement * 1000
			active = 0
			lastTickMs = nowMs()
	else if key is "A"
		if paused
			if not started and not savedOnFirstA
				saveSettings()
				savedOnFirstA = true
			paused = false
			lastTickMs = if started then nowMs() else null
		else
			advanceClock()
			paused = true
			lastTickMs = null
	else if key is "+"
		if paused
			adjustActiveField 1
	else if key is "-"
		if paused
			adjustActiveField -1
	else if key is "B"
		if paused
			activeField = (activeField + 1) % 4

	updateView()

render document.body, div {style:{maxWidth:"24em", margin:"0 auto", padding:"1em", fontFamily:"Consolas, 'Courier New', monospace", fontSize:"4em"}},
	div {style:{display:"flex", justifyContent:"center", marginBottom:"0.1em"}},
		clockLabel = label {style:{fontSize:"2em", minWidth:"11ch", textAlign:"center", whiteSpace:"pre"}}, ""
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.5em"}},
		button {style:{width:"8.1em", fontSize:"1em"}, onclick: -> update "L"}, "Left"
		button {style:{width:"8.1em", fontSize:"1em"}, onclick: -> update "R"}, "Right"
	div {style:{display:"flex", justifyContent:"center", gap:"0.1em", marginTop:"0.1em"}},
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "-"}, "➖"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "+"}, "➕"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "A"}, "⏯️"
		button {style:{width:"4em", fontSize:"1em"}, onclick: -> update "B"}, "☑️"

startTicker()
loadSettings()
increment = SECONDS[sec]
updateView()
