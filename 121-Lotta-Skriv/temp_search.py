from itertools import permutations
size=8

def schedule(order, rotate, orientation):
    rounds=[]
    for r in range(size-1):
        pairs=[]
        for i in range(size//2):
            a=order[i]; b=order[size-1-i]
            if orientation=='alternating':
                pair=(a,b) if (r+i)%2==0 else (b,a)
            elif orientation=='fixed_first':
                pair=(a,b)
            else:
                pair=(b,a)
            pairs.append(pair)
        rounds.append(pairs)
        order=rotate(order)
    return rounds

rots = {
    'fixed_last': lambda o: [o[1], *o[2:], o[0]],
    'fixed_first': lambda o: [o[0], o[-1], *o[1:-1]],
    'rotate_rest': lambda o: [o[0], *o[2:], o[1]],
    'rotate_left': lambda o: [*o[1:], o[0]],
    'rotate_right': lambda o: [o[-1], *o[:-1]],
    'inner': lambda o: [o[0], *o[2:-1], o[1], o[-1]]
}

for name, rot in rots.items():
    for orient in ['alternating','fixed_first','fixed_last']:
        for init in [list(range(size)), [7]+list(range(7)), list(range(1,8))+[0]]:
            rounds = schedule(init.copy(), rot, orient)
            opps=[]
            for r,pairs in enumerate(rounds):
                found=False
                for a,b in pairs:
                    if a==7:
                        opps.append(b+1)
                        found=True
                        break
                    if b==7:
                        opps.append(a+1)
                        found=True
                        break
                if not found:
                    opps=[]
                    break
            if opps==[1,2,3,4,5,6,7]:
                print('FOUND',name,orient,init,opps)
