from pathlib import Path


TOURNAMENT_FILE = Path("fairpair.txt")


def read_tournament(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        raise ValueError("Tom turneringsfil")

    player_count = len(lines[0].split())
    elos = []
    rounds = []

    for line_number, line in enumerate(lines[1:], start=2):
        parts = line.split()
        if len(parts) < 2:
            continue

        try:
            elo = int(parts[-1])
        except ValueError as exc:
            raise ValueError(f"Kunde inte läsa Elo på rad {line_number}") from exc

        elos.append(elo)
        rounds.append(line[4 : 4 + player_count * 2 : 2])

    if len(elos) != player_count:
        raise ValueError(f"Förväntade {player_count} spelare, hittade {len(elos)}")

    return elos, rounds


def average_elo_gap(elos, rounds):
    gaps = []

    for player_index, row in enumerate(rounds):
        for opponent_index in range(player_index + 1, len(elos)):
            if opponent_index >= len(row):
                raise ValueError(f"Saknar kolumn {opponent_index + 1} för spelare {player_index + 1}")

            if row[opponent_index].isdigit():
                gaps.append(abs(elos[player_index] - elos[opponent_index]))

    if not gaps:
        raise ValueError("Hittade inga partier")

    return sum(gaps) / len(gaps), len(gaps)


def main():
    elos, rounds = read_tournament(TOURNAMENT_FILE)
    average, game_count = average_elo_gap(elos, rounds)
    print(f"Antal partier: {game_count}")
    print(f"Genomsnittligt elogap: {average:.2f}")


if __name__ == "__main__":
    main()
