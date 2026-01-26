import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

export range = _.range
export echo = console.log

export class Game
	constructor : () ->
		@stack = []
		@showResults = false
		@pressed = new Set()

	gauss : (z) -> # visar komplexa tal
		[re, im] = z
		if re == 0 and im == 0 then return "0"
		if re == 0
			if im == 1 then return "i"
			if im == -1 then return "-i"
			return "#{im}i"

		if im == 0 then return "#{re}"
		sign = if im > 0 then '+' else "-"
		abs_im = if im < 0 then -im else im  # |im|
		im_part = if abs_im == 1 then 'i' else "#{abs_im}i"
		"#{re}#{sign}#{im_part}"

	found : (item, lst) -> _.some lst, (x) -> _.isEqual x, item

	calc : (s,x,y) ->
		stack = @stack
		for op in s
			if op=='x' then stack.push(x)
			if op=='y' then stack.push(y)
			if op=='1' then stack.push(1)
			if op=='2'then stack.push(2)
			if op=='+' then stack.push(stack.pop() + stack.pop())
			if op=='-'
				b = stack.pop()
				a = stack.pop()
				stack.push(a - b)
			if op=='*' then stack.push(stack.pop() * stack.pop())
			if op=='/'
				n = stack.length
				a = stack[n-2]
				b = stack[n-1]
				if a % b != 0 then return null
				stack.pop()
				stack.pop()
				stack.push(a // b)
			if op=='c' then stack.push(-stack.pop())
		stack.pop()

	operation : (s,pos) ->
		@stack = []
		[x,y] = pos
		[sx,sy] = s.split(':')
		x1 = @calc(sx,x,y)
		if x1 == null then return pos
		y1 = @calc(sy,x,y)
		[x1,y1]

	createProblem : ->
		pos = @createStart()
		visited = [pos]
		front1 = [pos]
		path = {}
		for i in range @level + 1
			ops = _.clone @ops
			if front1.length == 0 then break
			front0 = _.clone front1
			front1 = []
			for cand in front0
				for op in ops
					temp = @operation op, cand
					if @ok(temp) and not @found temp, visited
						key = @pretty temp
						path[key] = cand
						front1.push temp
						visited.push temp
		curr = _.sample front0
		res = []
		while curr != null
			res.unshift curr
			key = @pretty curr
			if key not of path then break
			curr = path[key]
		res

	startLevel : (level) ->
		@level = Math.max 1, level
		@solution = @createProblem @level
		@showResults = false
		@player1.done = false
		@player2.done = false
		@player1.reset @solution
		@player2.reset @solution
		@pressed.clear()
		@solution
