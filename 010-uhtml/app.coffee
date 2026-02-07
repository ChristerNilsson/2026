# anta att fasthtml.js redan är laddat
{ render } = FastHTML
{ div, span, h1, p } = FastHTML.tags

view = (name) ->
	div class: "greeting",
		h1 "Hej #{name}!"
		p  "Välkommen till sidan."

render document.body, view "Christer"
