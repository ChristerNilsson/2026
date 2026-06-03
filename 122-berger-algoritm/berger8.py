def berger8():
    top = [1, 2, 3, 4]
    bot = [8, 7, 6, 5]

    top_colors = ["W", "B", "W", "B"]
    bot_colors = ["B", "W", "B", "W"]

    for rond in range(1, 8):
        print(f"\nRond {rond}")
        print("".join(map(str, top)), f" R{rond}")
        print("".join(c.lower() for c in top_colors))
        print("".join(c.lower() for c in bot_colors))
        print("".join(map(str, bot)))

        print("Bord:")
        for bord in range(4):
            a = top[bord]
            b = bot[bord]

            if top_colors[bord] == "W":
                white, black = a, b
            else:
                white, black = b, a

            print(f"  Bord {bord + 1}: vit {white} - svart {black}")

        # rotera ett steg moturs runt rektangeln
        ring = top + bot[::-1]
        ring = ring[1:] + ring[:1]

        top = ring[:4]
        bot = ring[7:3:-1]


berger8()