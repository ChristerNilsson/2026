import random
import time

class Game:
	def __init__(self,ops,minimum,medium,maximum,level):
		self.ops = ops
		self.minimum = minimum
		self.medium = medium
		self.maximum = maximum
		self.level = level + 1
		self.stack = []

	def gauss(self,z):
		re, im = z
		if re == 0 and im == 0: return "0"
		if re == 0:
			if im == 1: return "i"
			elif im == -1: return "-i"
			else: return f"{im}i"
		if im == 0: return str(re)
		sign = "+" if im > 0 else "-"
		abs_im = -im if im < 0 else im  # |im|
		im_part = 'i' if abs_im == 1 else f"{abs_im}i"
		return f"{re}{sign}{im_part}"

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
			if op=='/':
				a = stack[-2]
				b = stack[-1]
				if a % b != 0: return None
				stack.pop()
				stack.pop()
				stack.append(a // b)

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

	def solve(self,pos):
		visited = [pos]
		front1 = [pos]
		path = {}
		for i in range(self.level):
			ops = self.ops.copy()
			if len(front1) == 0: break
			front0 = front1.copy()
			front1 = []
			for cand in front0:
				for op in ops:
					temp = self.operation(op, cand)
					if self.ok(temp) and not temp in visited:
						key = self.pretty(temp)
						path[key] = cand
						front1.append(temp)
						visited.append(temp)
			z = 99
		curr = random.choice(front0)
		res = []
		while curr != None:
			res.append(curr)
			key = self.pretty(curr)
			if not key in path: break
			curr = path[key]
		res = list(reversed(res))
		return res

	def instructions(self):
		for i in range(len(self.ops)):
			print(f"{"ABCDEFGH"[i]} = {self.ops[i]} ")

class Shortcut(Game):
	def __init__(self,ops,minimum,medium,maximum,level):
		self.start = [random.randint(minimum, medium), 0]
		super().__init__(ops,minimum,medium,maximum,level)
	def pretty(self,z): return self.gauss(z)
	def ok(self,temp): return self.minimum <= temp[0] <= self.maximum

class Shortcut2D(Game):
	def __init__(self,ops,minimum,medium,maximum,level):
		self.start = [random.randint(minimum,maximum), random.randint(minimum,maximum)]
		super().__init__(ops, minimum, medium, maximum, level)
	def pretty(self,z): return self.gauss(z)
	def ok(self,temp): return self.minimum <= temp[0] <= self.maximum and self.minimum <= temp[1] <= self.maximum

class Knight(Game):
	def __init__(self,ops,minimum,medium,maximum,level):
		self.start = [random.randint(minimum,maximum), random.randint(minimum,maximum)]
		super().__init__(ops, minimum, medium, maximum, level)
	def pretty(self,z): return "abcdefghijklmnop"[z[0] - 1] + f"{z[1]}"
	def ok(self, temp): return self.minimum <= temp[0] <= self.maximum and self.minimum <= temp[1] <= self.maximum

#game = Shortcut(["x2+:y", "x2*:y", "x2/:y"],1, 20, 40, 6)
#game = Shortcut2D(["x1+:y", "x2*:y2*", "y:x", "yc:x"], -10, 10, 20,15)
game = Knight(["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"], 1,8,8,6)
#game = Knight(["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"], 1,16,16,12)

t0 = time.time()
path = game.solve(game.start)
print(time.time() - t0)
game.instructions()
print()
start = path[0]
target = path[-1]
curr = start

print (f'go from {game.pretty(curr)} to {game.pretty(target)} in {len(path)-1} steps: ')
print(' '.join([game.pretty(p) for p in path]))

# while curr != target:
# 	ch = input(f'go from {pretty(curr)} to {pretty(target)} in {len(path)-1} steps: ').upper()
# 	i = "ABCDEFGH".index(ch)
# 	curr = game.operation(game.ops[i],curr)
# 	print(curr)
# 	z=99
# print(curr)
