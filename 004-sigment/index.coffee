echo = console.log 

import { div, mount } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

# import './module.js' # does not execute
import styles from './module.js'; # does not execute

echo styles.fnt600

mount "app", 
	div {}, 
		div {},
			'Hallo from Sigment', 
		div {class: styles.fnt600}, 'four'
