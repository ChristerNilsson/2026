echo = console.log

{ render, tag } = FastHTML

main = tag 'main'
div = tag 'div'
h1 = tag 'h1'
input = tag 'input'
label = tag 'label'
output = tag 'output'

controls =
	a: input type: "number", inputmode: "numeric", step: "50", value: 800
	b: input type: "number", inputmode: "numeric", step: "1",  value:  40
	c: input type: "number", inputmode: "numeric", step: "5",  value: 120
	d: output "aria-live": "polite", ""

formatKr = (value) -> value.toFixed 2

readInt = (control) ->
	raw = control?.value ? ""
	parsed = parseInt raw, 10
	if Number.isNaN parsed then null else parsed

compute = ->
	a = readInt controls.a
	b = readInt controls.b
	c = readInt controls.c
	return null unless a? and b? and c? and b isnt 0 and c isnt 0
	a * 60 / (b * 2 * c)

view = ->
	main class: "card",
		h1 "Kostnad per timme"
		div class: "grid",
			label "Kostnad (kr)", controls.a 
			label "Antal ronder", controls.b 
			label "Antal minuter (90 + 30 => 120)",	controls.c
		div class: "actions", controls.d

render document.body, view()

updateResult = ->
	result = compute()
	controls.d.textContent = if result? then "#{formatKr(result)} kr per timme" else ""

["a", "b", "c"].forEach (id) ->	controls[id]?.addEventListener "input", updateResult

updateResult()
