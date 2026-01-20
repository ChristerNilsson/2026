import { mount, signal, button, div } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

[showA, setShowA] = signal true
hide = "visibility:hidden"

mount "app",
	div {},
		div {style: => if showA() then "" else hide}, button {onclick: => setShowA false}, "A"
		div {style: => if showA() then hide else ""}, button {onclick: => setShowA true}, "B"
