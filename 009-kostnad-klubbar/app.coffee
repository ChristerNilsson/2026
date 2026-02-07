import { html, render } from "https://esm.sh/uhtml?bundle"

isAttrs = (value) ->
	value? and typeof value is "object" and not Array.isArray(value)

flatten = (items) ->
	out = []
	items.forEach (item) ->
		if Array.isArray item
			out = out.concat item
		else if item? or item is 0
			out.push item
	out

toNode = (items) ->
	return items[0] if items.length is 1
	frag = document.createDocumentFragment()
	items.forEach (item) ->
		if Array.isArray item
			item.forEach (nested) ->
				frag.appendChild if nested?.nodeType then nested else document.createTextNode String(nested)
		else if item?.nodeType
			frag.appendChild item
		else if item? or item is 0
			frag.appendChild document.createTextNode String(item)
	frag

h = (tag, propsOrChild, children...) ->
	props = {}
	if isAttrs propsOrChild
		props = propsOrChild
	else if propsOrChild? or propsOrChild is 0
		children = [propsOrChild].concat children

	childNode = toNode flatten children
	hasProps = Object.keys(props).length > 0

	switch tag
		when "main"
			if hasProps then `html\`<main ...${props}>${childNode}</main>\`` else `html\`<main>${childNode}</main>\``
		when "div"
			if hasProps then `html\`<div ...${props}>${childNode}</div>\`` else `html\`<div>${childNode}</div>\``
		when "h1"
			if hasProps then `html\`<h1 ...${props}>${childNode}</h1>\`` else `html\`<h1>${childNode}</h1>\``
		when "p"
			if hasProps then `html\`<p ...${props}>${childNode}</p>\`` else `html\`<p>${childNode}</p>\``
		when "label"
			if hasProps then `html\`<label ...${props}>${childNode}</label>\`` else `html\`<label>${childNode}</label>\``
		when "output"
			if hasProps then `html\`<output ...${props}>${childNode}</output>\`` else `html\`<output>${childNode}</output>\``
		when "input"
			if hasProps then `html\`<input ...${props}>\`` else `html\`<input>\``
		else
			if hasProps then `html\`<div ...${props}>${childNode}</div>\`` else `html\`<div>${childNode}</div>\``

tag = (name) ->
	(args...) -> h name, args...

main = tag "main"
div = tag "div"
h1 = tag "h1"
p = tag "p"
label = tag "label"
output = tag "output"
input = tag "input"

DEFAULTS =
	a: 800
	b: 40
	c: 120

formatKr = (value) -> value.toFixed(2)

readInt = (id) ->
	raw = document.getElementById(id)?.value ? ""
	parsed = parseInt(raw, 10)
	if Number.isNaN(parsed) then null else parsed

compute = ->
	a = readInt("a")
	b = readInt("b")
	c = readInt("c")
	return null unless a? and b? and c? and b isnt 0 and c isnt 0
	a * 60 / (b * 2 * c)

view = ->
	main { class: "card" }, 
		h1 "Kostnad per timme"
		p { class: "hint" }, "Ange heltal f�r A, B och C."
		div { class: "grid" },
			label {},
				"A (kr)"
				input { id: "a", type: "number", inputmode: "numeric", step: "50", value: DEFAULTS.a }
			label {},
				"B (ronder)"
				input { id: "b", type: "number", inputmode: "numeric", step: "1", value: DEFAULTS.b }
			label {},
				"C (minuter)"
				input { id: "c", type: "number", inputmode: "numeric", step: "5", value: DEFAULTS.c }
		div { class: "actions" },
			output { id: "result", "aria-live": "polite" }, "�"
		p { class: "formula" }, "A � 60 � (B � 2 � C)"

render document.body, view()

updateResult = ->
	result = compute()
	outputEl = document.getElementById("result")
	if result?
		outputEl.textContent = "#{formatKr(result)} kr per timme"
	else
		outputEl.textContent = "�"

["a", "b", "c"].forEach (id) ->
	document.getElementById(id)?.addEventListener "input", updateResult
updateResult()
