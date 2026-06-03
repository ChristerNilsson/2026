def berger(n=8):
    assert n % 2 == 0
    m = n // 2
    arr = list(range(1, n + 1))
    top_colors = ["W" if i % 2 == 0 else "B" for i in range(m)]  # WBWB...

    for rond in range(1, n):
        top = arr[:m].copy()
        bottom = arr[:m-1:-1].copy()

        # låt spelare 1 växla färg vid bord 1
        if rond % 2 == 0:
            top[0], bottom[0] = bottom[0], top[0]

        print(f"\nRond {rond}")
        print("".join(map(str, top)))
        print("".join(top_colors).lower())
        print("".join("B" if c == "W" else "W" for c in top_colors).lower())
        print("".join(map(str, bottom)))

        print("Bord:")
        for b, (a, c) in enumerate(zip(top, bottom), start=1):
            top_color = top_colors[b-1]

            if top_color == "W":
                white, black = a, c
            else:
                white, black = c, a

            print(f"  Bord {b}: {white}-{black}")

        # rotera alla utom spelare 1
        arr = [arr[0]] + arr[2:] + [arr[1]]


berger(8)