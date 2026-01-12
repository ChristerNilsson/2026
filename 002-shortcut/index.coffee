echo = console.log
	# Vänta tills module-scriptet hunnit köra och window.Sigment finns
waitForSigment = (cb) ->
	if window.Sigment? then cb() else setTimeout((-> waitForSigment(cb)), 0)

waitForSigment ->
	{ signal } = window.Sigment
	# Tag-funktionerna kan ligga antingen på Sigment-objektet eller vara globala beroende på build.
	# Vi plockar dem defensivt.
	div    = window.Sigment.div    ? window.div
	h1     = window.Sigment.h1     ? window.h1
	h2     = window.Sigment.h2     ? window.h2
	p      = window.Sigment.p      ? window.p
	span   = window.Sigment.span   ? window.span
	input  = window.Sigment.input  ? window.input
	button = window.Sigment.button ? window.button

	unless div? and button? and input?
		document.body.innerHTML = "<pre>Sigment tag functions saknas i denna build. Testa Sigment NG-varianten i docs om detta händer.</pre>"
		return

	OP_COST = 10  # sekunder per operation
	now = -> performance.now()

	defaultPlayer = (start) ->
		cur: start
		ops: 0
		history: []
		path: [start]
		t0: null
		tFinish: null

	canHalf = (n) -> (n % 2) is 0

	elapsedSeconds = (st) ->
		return 0 unless st.t0?
		tEnd = if st.tFinish? then st.tFinish else now()
		(tEnd - st.t0) / 1000

	totalConsumption = (st) ->
		(st.ops * OP_COST) + elapsedSeconds(st)

	# --- Reaktiva signals: start/target + två spelare ---
	[start, setStart]   = signal 7
	[target, setTarget] = signal 6

	[p1, setP1] = signal defaultPlayer start()
	[p2, setP2] = signal defaultPlayer start()

	getPlayer = (pid) -> if pid is 1 then p1() else p2()
	setPlayer = (pid, st) -> if pid is 1 then setP1(st) else setP2(st)

	resetPlayer = (pid) ->
		setPlayer pid, defaultPlayer start()

	resetAll = ->
		resetPlayer 1
		resetPlayer 2

	# --- Event-kö för samtidiga tryck (pointer) ---
	eventQueue = []
	activePointersByKey = new Map() # "pid:op" -> Set(pointerId)

	keyFor = (pid, op) -> "#{pid}:#{op}"
	getPtrSet = (pid, op) ->
		k = keyFor pid, op
		s = activePointersByKey.get k
		unless s?
			s = new Set()
		activePointersByKey.set k, s
		s

	enqueue = (type, pid, op, pointerId) ->
		eventQueue.push { type, pid, op, pointerId, t: now() }

	# Logg (valfritt)
	[logText, setLogText] = signal ""
	appendLog = (line) ->
		setLogText logText() + line + "\\n"

	# --- Speloperationer ---
	applyOp = (pid, op) ->
		st = structuredClone getPlayer(pid)

		if op is 'undo'
			return undoOp pid

		# starta klocka vid första riktiga operationen
		st.t0 ?= now()

		if op is 'half' and not canHalf(st.cur)
			return

		st.history.push st.cur

		if op is 'plus2' then st.cur += 2
		else if op is 'times2' then st.cur *= 2
		else if op is 'half' then st.cur = st.cur / 2

		st.ops += 1
		st.path.push st.cur

		# mål?
		if st.cur is target()
			st.tFinish ?= now()
		else
			st.tFinish = null

		setPlayer pid, st

	undoOp = (pid) ->
		st = structuredClone getPlayer(pid)
		return unless st.history.length > 0
		st.cur = st.history.pop()
		# ops minskar inte; tid återfås inte
		if st.path.length > 1 then st.path.pop()

		if st.cur is target()
			st.t0 ?= now()
			st.tFinish ?= now()
		else
			st.tFinish = null

		setPlayer pid, st

	# --- Ticking: processa eventQueue ---
	TICK_MS = 1000 / 60
	tick = ->
		echo 'tick',eventQueue.length
		while eventQueue.length > 0
			ev = eventQueue.shift()

			if ev.type is 'down'
				applyOp ev.pid, ev.op
				appendLog "#{ev.t.toFixed(2)}ms  P#{ev.pid} #{ev.op} DOWN (ptr #{ev.pointerId})"
			else
				appendLog "#{ev.t.toFixed(2)}ms  P#{ev.pid} #{ev.op} #{ev.type.toUpperCase()} (ptr #{ev.pointerId})"

	setInterval tick, TICK_MS

	# --- UI helpers: pointer handlers för knappar ---
	onBtnDown = (pid, op) -> (e) ->
		echo 'onBtnDown'
		e.preventDefault()
		try e.currentTarget.setPointerCapture(e.pointerId) catch err then null
		s = getPtrSet pid, op
		s.add e.pointerId
		enqueue 'down', pid, op, e.pointerId

	onBtnUp = (pid, op, type) -> (e) ->
		echo 'onBtnUp'
		e.preventDefault()
		s = getPtrSet pid, op
		s.delete e.pointerId
		enqueue type, pid, op, e.pointerId

	# --- Komponent: PlayerPanel ---
	PlayerPanel = (pid, titleText) ->
		st = -> getPlayer(pid)

		isWin = -> st().cur is target()
		halfDisabled = -> not canHalf(st().cur)
		undoDisabled = -> st().history.length is 0

		# total & tid reaktiva via funktion-barn
		div({ className: -> "panel" + (if isWin() then " win" else "") },
			h2(titleText),
			div({ className: "grid" },
				div({ className:"meta" }, 
					"Nuvarande"), 
					div({ className:"big" }, -> String(st().cur)),
				div({ className:"meta" }, "Operationer"), div(-> String(st().ops)),
				div({ className:"meta" }, "Tid"), div(-> "#{elapsedSeconds(st()).toFixed(1)} s"),
				div({ className:"meta" }, "Total"), div(-> "#{totalConsumption(st()).toFixed(1)} s")
			),
			div({ className:"keys" },
				div({ className: "btn", onPointerdown: onBtnDown(pid,'plus2'),  onPointerup: onBtnUp(pid,'plus2','up'),  onPointercancel: onBtnUp(pid,'plus2','cancel') },  "+2"),
				div({ className: "btn", onPointerdown: onBtnDown(pid,'times2'), onPointerup: onBtnUp(pid,'times2','up'), onPointercancel: onBtnUp(pid,'times2','cancel') }, "×2"),
				div({ 
					className: -> "btn" + (if halfDisabled() then " disabled" else ""), 
					onPointerdown: onBtnDown(pid,'half'), 
					onPointerup: onBtnUp(pid,'half','up'), 
					onPointercancel: onBtnUp(pid,'half','cancel') 
					}, "÷2"),
				div({ 
					className: -> "btn" + (if undoDisabled() then " disabled" else ""), 
					onPointerdown: onBtnDown(pid,'undo'), 
					onPointerup: onBtnUp(pid,'undo','up'), 
					onPointercancel: onBtnUp(pid,'undo','cancel') 
					}, "Undo")
			),
			div({ className:"meta", style:"margin-top:10px;" },
				"Väg: ",
				span(-> st().path.join(" "))
			)
		)

	WinnerLine = ->
		s1 = -> p1()
		s2 = -> p2()
		bothDone = -> (s1().cur is target()) and (s2().cur is target())

		div({ className:"meta", style:"margin-top:8px; font-weight:700;" },
			-> if not bothDone()
					""
				else
					t1 = totalConsumption(s1())
					t2 = totalConsumption(s2())
					if Math.abs(t1 - t2) < 1e-6
						"Oavgjort: båda #{t1.toFixed(1)} s"
					else if t1 < t2
						"Spelare 1 vinner: #{t1.toFixed(1)} s mot #{t2.toFixed(1)} s"
					else
						"Spelare 2 vinner: #{t2.toFixed(1)} s mot #{t1.toFixed(1)} s"
		)

	# --- App ---
	App = ->
		div({},
			h1("Shortcut"),
			div({ className:"panel" },
				div({ className:"meta" },
					"Start: ",
					input({ 
						type:"number", 
						value: -> String(start()), 
						style:"width:90px;", 
						onInput: (e) -> setStart parseInt(e.target.value,10) or 0
					}),

					"  Mål: ",
					input({ 
						type:"number", 
						value: -> String(target()), 
						style:"width:90px;", 
						onInput: (e) -> setTarget parseInt(e.target.value,10) or 0
					}),
					" ",
					button({ onClick: -> resetAll() }, "Reset")
				),
				WinnerLine()
			),
			div({ className:"row" },
				PlayerPanel(1, "Spelare 1"),
				PlayerPanel(2, "Spelare 2"),
				div({ className:"panel", style:"flex:1 1 420px;" },
				h2("Eventlogg (valfritt)"),
				button({ onClick: -> setLogText "" }, "Rensa logg"),
				div({ className:"log" }, -> logText())
				)
			)
		)

	document.querySelector('#app').appendChild(App())
