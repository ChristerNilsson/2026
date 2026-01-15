import { createSignal , div, button , h1 , p, mount } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

# import styles from './hello.module.css'; # fungerar ej
# import './hello.css' # fungerar ej

App = ->
	div {class: 'hi'},
		div {class: 'hix'},
			'Hallå från Sigment',
		div {class: 'hix'},
			'fyran'
	
mount "app", App()