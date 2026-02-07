echo = console.log

{ render, tag } = FastHTML

main = tag 'main'
div = tag 'div'
h1 = tag 'h1'
input = tag 'input'
label = tag 'label'
output = tag 'output'

DEFAULTS = {a: 800,	b: 40, c: 120}

formatKr = (value) -> value.toFixed 2

readInt = (id) ->
	raw = document.getElementById(id)?.value ? ""
	parsed = parseInt raw, 10
	if Number.isNaN parsed then null else parsed

compute = ->
	a = readInt "a"
	b = readInt "b"
	c = readInt "c"
	return null unless a? and b? and c? and b isnt 0 and c isnt 0
	a * 60 / (b * 2 * c)

view = ->
	main class: "card",
		h1 "Kostnad per timme"
		div class: "grid",
			label "Kostnad (kr)", input id: "a", type: "number", inputmode: "numeric", step: "50", value: DEFAULTS.a
			label "Antal ronder", input id: "b", type: "number", inputmode: "numeric", step: "1", value: DEFAULTS.b
			label "Antal minuter (90 + 30 => 120)",	input id: "c", type: "number", inputmode: "numeric", step: "5", value: DEFAULTS.c
		div class: "actions", output id: "result", "aria-live": "polite", ""

render document.body, view()

updateResult = ->
	result = compute()
	outputEl = document.getElementById("result")
	outputEl.textContent = if result? then "#{formatKr(result)} kr per timme" else outputEl.textContent = ""

["a", "b", "c"].forEach (id) ->	document.getElementById(id)?.addEventListener "input", updateResult

updateResult()
