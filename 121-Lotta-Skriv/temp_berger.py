size = 8

def run(rot_name, rot):
    order = list(range(size))
    print(rot_name)
    for r in range(size-1):
        pairs=[]
        for i in range(size//2):
            first=order[i]
            second=order[size-1-i]
            if (r+i)%2==0:
                pairs.append((first+1,second+1))
            else:
                pairs.append((second+1,first+1))
        print('R'+str(r+1), pairs, 'board1', pairs[0])
        order = rot(order)
    print()

run('fixed_last_candidate', lambda o: [*o[1:-1], o[0], o[-1]])
