import {testReducer,node} from './TestReducer.js'

test = node 'test'
add2 = node 'add2', (state) ->
	{...state, re: state.re + 2}
mul2 = node 'mul2', (state) ->
	{...state, re: state.re * 2, im: state.im * 2}
rotate = node 'rotate', (state) ->
	{...state, re: -state.im, im: state.re}
mirror = node 'mirror', (state) ->
	{...state, re: state.im, im: state.re}

script = test {re:3, im:4},
	add2 {re:5, im:4},
		mul2 {re:10, im:8},
			mirror {re:8, im:10}
		rotate {re:-4, im:5},
			mirror {re:5, im:-4}
		mirror {re:4, im:5}
	mul2 {re:6, im:8},
		add2 {re:8, im:8},
			rotate {re:-8, im:8},
				mirror {re:8, im:-8}
			mirror {re:8, im:8}
		mirror {re:8, im:6}
	rotate {re:-4, im:3},
		mul2 {re:-8, im:6},
			mirror {re:6, im:-8}
		mirror {re:3, im:-4}
	mirror {re:4, im:3}

result = testReducer script

console.log result
