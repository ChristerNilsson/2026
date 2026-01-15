import { div, mount } from "https://cdn.jsdelivr.net/gh/sigmentjs/sigment-ng@1.3.4/dist/index.js"

#import styles from './hello.module.css'; # does not execute
#import './index.css' # does not execute

mount "app", 
	div {},
		div {},
			'Hallo from Sigment', 
		div class: 'hi',
			'four'
