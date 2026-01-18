import random

class Game:
	def __init__(self, ops, minimum, maximum):
		self.ops = ops
		self.minimum = minimum
		self.maximum = maximum
		self.start = [random.randint(self.minimum,self.maximum), random.randint(self.minimum,self.maximum)]
		self.n = 4
		self.stack = []

	def calc(self,s,x,y):
		stack = self.stack
		for op in s:
			if op=='x': stack.append(x)
			if op=='y': stack.append(y)
			if op=='1': stack.append(1)
			if op=='2': stack.append(2)
			if op=='+': stack.append(stack.pop() + stack.pop())
			if op=='-':
				b = stack.pop()
				a = stack.pop()
				stack.append(a - b)
			if op=='*': stack.append(stack.pop() * stack.pop())
			# if op=='/':
			# 	a = stack[-2]
			# 	b = stack[-1]
			# 	if a % b != 0: return None
			# 	stack.pop()
			# 	stack.pop()
			# 	stack.append(a // b)

			if op=='c': stack.append(-stack.pop())
		return stack.pop()

	def operation(self,s,pos):
		self.stack.clear()
		x,y = pos
		sx,sy = s.split(':')
		x1 = self.calc(sx,x,y)
		if x1 is None: return pos
		y1 = self.calc(sy,x,y)
		return [x1,y1]

	def moveRandomly(self,pos):
		visited = [pos]
		for i in range(self.n):
			ops = self.ops.copy()
			random.shuffle(ops)
			for op in ops:
				# op = random.choice(OPS) #  = randint(0,len(OPS)-1)
				temp = self.operation(op, pos)
				ok = self.minimum <= temp[0] <= self.maximum and self.minimum <= temp[1] <= self.maximum
				if ok and not temp in visited: break
			pos = temp
			visited.append(pos)
		print(visited)
		return pos

	def instructions(self):
		for i in range(len(self.ops)):
			print(f"{"ABCDEFGH"[i]} = {self.ops[i]} ")

	def pretty(self,pos):
		x,y = pos
		if y>0: return f"{x}+{y}i"
		if y<0: return f"{x}{y}i"
		return f"{x}"

# game = Game(["x2+", "x2*", "x2/"],[],[])
game = Game(["x1+:y", "x2*:y2*", "y:x", "yc:x"], -20,20)
# game = Game(["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"], 1,8)

target = game.moveRandomly(game.start)
game.instructions()
pos = game.start
print()
while pos != target:
	ch = input(f'go from {game.pretty(pos)} to {game.pretty(target)} in {game.n} steps: ').upper()
	i = "ABCDEFGH".index(ch)
	pos = game.operation(game.ops[i],pos)
print(game.pretty(pos))
