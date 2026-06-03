def berger(n):
    assert n % 2 == 0 and n >= 4

    fixed = n
    m = n // 2
    mod = n - 1

    def wrap(x):
        return ((x - 1) % mod) + 1

    rounds = []

    for r in range(1, n):
        games = []

        # Motståndare till den fasta spelaren n
        if r % 2 == 1:
            opp = (r + 1) // 2
            games.append((opp, fixed))      # opp vit
        else:
            opp = m + r // 2
            games.append((fixed, opp))      # fixed vit

        # Övriga partier
        for i in range(1, m):
            white = wrap(opp + i)
            black = wrap(opp - i)
            games.append((white, black))

        rounds.append(games)

    return rounds


def print_berger(n):
    for r, games in enumerate(berger(n), start=1):
        text = ", ".join(f"{w}-{b}" for w, b in games)
        print(f"Rd {r}: {text}.")


print_berger(8)