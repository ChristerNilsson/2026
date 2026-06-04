def berger(n):
    assert n % 2 == 0 and n >= 4

    fixed = n
    m = n // 2
    mod = n - 1

    def wrap(x):
        return ((x - 1) % mod) + 1

    def board_order(m):
        # För m=4 ger detta: [3,2,4,1]
        return list(range(m - 1, 1, -1)) + [m, 1]

    order = board_order(m)
    rounds = []

    for r in range(1, n):
        games = []

        if r % 2 == 1:
            opp = (r + 1) // 2
            games.append((opp, fixed))
        else:
            opp = m + r // 2
            games.append((fixed, opp))

        for i in range(1, m):
            white = wrap(opp + i)
            black = wrap(opp - i)
            games.append((white, black))

        # kasta om till bordsordning
        games = [games[i - 1] for i in order]

        rounds.append(games)

    return rounds
