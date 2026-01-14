# Starta med ett tresiffrigt tal.
# Använd minst två olika siffror.
# Sortera siffrorna fallande => a
# Sortera siffrorna stigande => b
# Beräkna a-b
# Loopa tills 495 uppnås.
# Det ska ta högst sex gånger.

def kaprekar(n):
	if n == 0: return 0
	if n == 495: return 495

	s = str(n)
	s = s.zfill(3)

	a = list(s)
	a.sort()
	b = int("".join(a))
	a.reverse()
	a = int("".join(a))

	return a-b

res = [kaprekar(i) for i in range(0,1000)]

s = "00"
print("     0   1   2   3   4   5   6   7   8   9")
for i in range(1000):
	s += " " + str(res[i]).zfill(3)
	if i % 10 == 9:
		print(s)
		s = str((i+1)//10).zfill(2)

# print(res)

