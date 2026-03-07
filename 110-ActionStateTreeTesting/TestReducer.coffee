import {isDeepStrictEqual} from 'node:util'

assert = (x,y) ->
	if not isDeepStrictEqual x,y
		throw new Error 'Assertion failed'

export testReducer = (script,reducers,stack) ->

	states = [] 
	halted = false

	run = ->
		for line,nr in script.split '\n'
			break if halted
			runTest line,nr

	runTest = (line,nr) ->
		index = countTabs line
		if index == 0 then return states = [JSON.parse line]
		line = line.trim()
		stack.length = 0
		arr = line.split ' '
		state = states[index-1] 
		for cmd in arr	
			break if halted
			state = rpn cmd,state,nr 
		return if halted
		states[index] = state 
		while stack.length >= 2 and not halted
			rpn '==',state,nr
		if stack.length == 1
			console.log "Orphan in line #{nr+1}"
			halted = true

	rpn = (cmd,state,nr) ->
		if cmd == '@'
			stack.push state
			return state
		if cmd.toLowerCase() of state 
			stack.push state[cmd.toLowerCase()]
			return state
		if cmd of reducers then return state = reducers[cmd] state
		if cmd == '==' 
			try
				x = stack.pop()
				y = stack.pop()
				assert x, y
			catch
				console.log 'Assert failure in line ' + (nr + 1)
				console.log '  Expect', JSON.stringify x
				console.log '  Actual', JSON.stringify y
				halted = true
			return state
		try
			stack.push JSON.parse cmd
		catch
			console.log 'JSON.parse failure in line ' + (nr + 1)
			console.log '  ',cmd
			halted = true
		return state

	countTabs = (line) ->
		result = 0
		for ch in line
			if ch != '\t' then return result
			result++
		result

	run()
