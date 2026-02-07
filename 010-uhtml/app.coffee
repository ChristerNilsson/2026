{ render, tag } = FastHTML

echo = console.log

div = tag 'div'
h1 = tag 'h1'
p = tag 'p'

view = (name) ->
	div class: "greeting",
		h1 "Hej #{name}!"
		p  "Välkommen till sidan."

echo view 'Christer'

render document.body, view "Christer"
