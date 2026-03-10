import {testReducer} from './TestReducer.js'

updateA = (state, nextA) ->
	{...state, a: nextA}

reducers =
	add2: (state) -> updateA state, state.a + 2
	mul2: (state) -> updateA state, state.a * 2
	div2: (state) -> updateA state, state.a / 2

node = (name) ->
	(expected, children...) ->
		{name, expected, children}

test = node 'test'
add2 = node 'add2'
mul2 = node 'mul2'
div2 = node 'div2'

script = test {a:7},
	add2 {a:9},
		mul2 {a:18}
	mul2 {a:14},
		add2 {a:16},
			div2 {a:9}

result = testReducer script, reducers

console.log result
