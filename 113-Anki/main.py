import random

N = 10 # cards
BOXES = 5
CARDS = 5 # per day
DONE = 10000

cards=[]
day = -1

class Card:
	def __init__(self, i, *args, **kwargs):
		self.index = i
		self.box = 0
		self.due= 9999

for i in range(N):
	cards.append(Card(i))

while len(cards) > 0:
	cards.sort(key = lambda x: x.due)
	day += 1
	if day == N * 2: break
	print('day',day)
	counter = 0
	for card in cards:
		if counter < CARDS:
			if card.box == BOXES:
				card.due = DONE
				continue
			if card.due == DONE : continue
			if card.due > day and card.due != 9999: continue
			if random.randint(1,6) == 1:
				print('  Card',card.index, card.box, card.due, 'failure')
				card.box -= 2
				if card.box < 0: card.box = 0
			else:
				print('  Card',card.index, card.box, card.due, 'correct')
				card.box += 1
			card.due = day + 2 ** card.box
			counter += 1

for card in cards:
	print(card.index,card.box, card.due)