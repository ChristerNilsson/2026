import random
import time

N = 1000000
K = 20
players = {}
transactions = []

start = time.time()

# Skapa alla spelare
ids = []
for i in range(N):
	ids.append(int(1000000 + 2000000 * random.random()))
ids.sort()

with open('players.txt', 'w') as g:
	for id in ids:
		rating = int(1400 + 1400 * random.random())
		players[id] = rating
		g.write(f"{id} {rating}\n")

print('A',time.time() - start)
start = time.time()

# Skapa alla transaktioner
with open('transactions.txt', 'w') as g:
	ids = list(players.keys())
	for i in range(N):
		t = [random.choice(ids), random.choice(ids), random.choice([0,0.5,1])]
		transactions.append(t)
		g.write(f"{t[0]} {t[1]} {t[2]}\n")

print('B',time.time() - start)
start = time.time()

def f(diff): return 1 / (1 + 10 ** (-diff / 400))

def calc(w, b, score):
	diff = w - b
	expected = f(diff) # förväntat resultat för vit
	res = round(K * (score - expected), 1)
	return [res, -res]

temp = players.copy()
with open('log.txt', 'w') as g:
	for white,black,score in transactions:
		w = players[white]
		b = players[black]
		wd,bd = calc(w,b,score)
		temp[white] += wd
		temp[black] += bd
		diff = w - b
		#g.write(f"{white} {black} {w} {b} {score} {diff} {wd} {bd} {temp[white]} {temp[black]}\n")
players = temp

print('C',time.time() - start)
start = time.time()

with open('players_out.txt', 'w') as g:
	for id in ids:
		rating = players[id]
		g.write(f"{id} {rating}\n")

print('D',time.time() - start)

# print(round(f(100),2)) # 0.64
# print(round(f(-100),2)) # 0.36
# print(time.time() - start)

def ass(a,b):
	if a != b:
		print(a,b)
		assert(a==b)

ass(calc(1694,1736, 0), [-8.8,8.8])
ass(calc(1745,1668, 0), [-12.2,12.2])
ass(calc(1668,1706, 1), [11.1,-11.1])

ass(calc(1739,1695, 0.5), [-1.3,1.3])

ass(calc(1700,1000, 1), [0.3,-0.3])
ass(calc(1200,1000, 1), [4.8,-4.8])
ass(calc(1000,1000, 1), [10,-10])
ass(calc(1000,1200, 1), [15.2,-15.2])
ass(calc(1000,1700, 1), [19.7,-19.7])

ass(calc(1700,1000, 0.5), [-9.7,9.7])
ass(calc(1200,1000, 0.5), [-5.2,5.2])
ass(calc(1000,1000, 0.5), [0,0])
ass(calc(1000,1200, 0.5), [5.2,-5.2])
ass(calc(1000,1700, 0.5), [9.7,-9.7])

ass(calc(1700,1000, 0), [-19.7,19.7])
ass(calc(1200,1000, 0), [-15.2,15.2])
ass(calc(1000,1000, 0), [-10,10])
ass(calc(1000,1200, 0), [-4.8,4.8])
ass(calc(1000,1700, 0), [-0.3,0.3])

z=99