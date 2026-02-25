# Detta är egentligen inte fastHTML. Jag är bara ute efter taggarna

# Hjälp: är det ett “props-objekt” och inte ett barn?
isPropsObject = (x) -> 
	return false unless x?
	return false unless typeof x is 'object'
	return false if Array.isArray x
	return false if x.nodeType?	 # DOM-nod
	true

# Skapa textnod från allt som inte är nod
toNode = (v) ->
	return v if v? and v.nodeType?
	document.createTextNode String(v)

# Bas: h(tag, [props], ...children)
h = (tag, firstArg, children...) ->
	el = document.createElement tag

	props = {}
	if isPropsObject firstArg
		props = firstArg
	else if firstArg? then children = [firstArg].concat children

	# Attribut / event / properties
	for key, val of props when val?	# ignorera null/undefined
		if key is 'style' and typeof val is 'object'
			# t.ex. style: { color: 'red', fontWeight: 'bold' }
			for sk, sv of val when sv?
				el.style[sk] = sv
		else if key is 'class' or key is 'className'
			el.className = String val
		else if key is 'dataset' and typeof val is 'object'
			for dk, dv of val when dv?
				el.dataset[dk] = String dv
		else if key.slice(0, 2) is 'on' and typeof val is 'function'
			# t.ex. onclick: -> ...
			el[key] = val
		else
			el.setAttribute key, String(val)

	# Barn
	for child in children when child?
		if Array.isArray child
			for c in child when c?
				el.appendChild toNode c
		else
			el.appendChild toNode child

	el

# Skapar en taggfunktion: tag('div') => (args...) -> h('div', ...)
export tag = (name) -> (args...) -> h name, args...

# Enkel render: töm elementet och lägg in nytt innehåll
export render = (where, node) ->
	where.innerHTML = ''
	if Array.isArray node
		for n in node when n?
			where.appendChild n
	else if node?
		where.appendChild node
	where

# Exportera till global namespace i browsern
# @FastHTML = {render,tag}
