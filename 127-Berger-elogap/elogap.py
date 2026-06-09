from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


GROUP_SIZE = 8
GROUP_COUNT = 5
PAIR_FILE = Path("fairpair.txt")


@dataclass(frozen=True)
class Player:
    number: int
    elo: int


def parse_players_and_existing_pairs(path: Path) -> tuple[list[Player], set[tuple[int, int]]]:
    players: list[Player] = []
    existing_pairs: set[tuple[int, int]] = set()

    lines = path.read_text(encoding="utf-8").splitlines()
    player_rows = lines[1:]

    for row_index, line in enumerate(player_rows, start=1):
        parts = line.split()
        if len(parts) < 2:
            continue

        elo = int(parts[-1])
        cells = parts[1:-1]
        players.append(Player(row_index, elo))

        for col_index, cell in enumerate(cells, start=1):
            if col_index <= row_index:
                continue
            if cell.isdigit():
                existing_pairs.add((row_index, col_index))

    return players, existing_pairs


def berger_rounds(players: list[Player]) -> list[list[tuple[Player, Player]]]:
    if len(players) != GROUP_SIZE:
        raise ValueError(f"Bergergruppen maste ha {GROUP_SIZE} spelare.")

    fixed = players[0]
    rotating = players[1:]
    rounds: list[list[tuple[Player, Player]]] = []

    for round_index in range(GROUP_SIZE - 1):
        current = [fixed, *rotating]
        pairs = [
            (current[i], current[GROUP_SIZE - 1 - i])
            for i in range(GROUP_SIZE // 2)
        ]

        # Varannan rond vands for att inte ge fast spelare samma farg varje rond.
        if round_index % 2:
            pairs = [(black, white) for white, black in pairs]

        rounds.append(pairs)
        rotating = [rotating[-1], *rotating[:-1]]

    return rounds


def make_groups(players: list[Player]) -> list[list[Player]]:
    sorted_players = sorted(players, key=lambda player: player.elo, reverse=True)
    needed = GROUP_SIZE * GROUP_COUNT

    if len(sorted_players) < needed:
        raise ValueError(f"Det kravs minst {needed} spelare, hittade {len(sorted_players)}.")

    return [
        sorted_players[start : start + GROUP_SIZE]
        for start in range(0, needed, GROUP_SIZE)
    ]


def pair_key(a: Player, b: Player) -> tuple[int, int]:
    return tuple(sorted((a.number, b.number)))


def average_elo_gap(groups: list[list[Player]], existing_pairs: set[tuple[int, int]]) -> tuple[float, int, int]:
    total_gap = 0
    counted_pairs = 0
    ignored_pairs = 0

    for group in groups:
        for round_pairs in berger_rounds(group):
            for white, black in round_pairs:
                if pair_key(white, black) in existing_pairs:
                    ignored_pairs += 1
                    continue

                total_gap += abs(white.elo - black.elo)
                counted_pairs += 1

    if counted_pairs == 0:
        raise ValueError("Inga nya par fanns att rakna pa.")

    return total_gap / counted_pairs, counted_pairs, ignored_pairs


def print_group_details(groups: list[list[Player]], existing_pairs: set[tuple[int, int]]) -> None:
    print(f"Antal Bergergrupper: {len(groups)}")
    print(f"Gruppstorlek: {GROUP_SIZE}")
    print(f"Ronder per grupp: {GROUP_SIZE - 1}")
    print()

    total_scheduled = 0
    total_counted = 0
    total_ignored = 0

    for group_index, group in enumerate(groups, start=1):
        rounds = berger_rounds(group)
        scheduled = sum(len(round_pairs) for round_pairs in rounds)
        counted = 0
        ignored = 0
        group_gap = 0

        print(f"Grupp {group_index}:")
        print("  Spelare: " + ", ".join(f"{player.number}({player.elo})" for player in group))
        print(f"  Ronder: {len(rounds)}")
        print(f"  Schemalagda par: {scheduled}")

        for round_index, round_pairs in enumerate(rounds, start=1):
            round_descriptions: list[str] = []
            for white, black in round_pairs:
                gap = abs(white.elo - black.elo)
                is_existing = pair_key(white, black) in existing_pairs
                suffix = " ignoreras" if is_existing else f" gap={gap}"
                round_descriptions.append(f"{white.number}-{black.number}{suffix}")

                if is_existing:
                    ignored += 1
                else:
                    counted += 1
                    group_gap += gap

            print(f"  Rond {round_index}: " + "; ".join(round_descriptions))

        group_average = group_gap / counted if counted else 0
        print(f"  Raknade par: {counted}")
        print(f"  Ignorerade befintliga par: {ignored}")
        print(f"  Genomsnittligt elogap i gruppen: {group_average:.2f}")
        print()

        total_scheduled += scheduled
        total_counted += counted
        total_ignored += ignored

    print(f"Kontroll schemalagda par totalt: {total_scheduled}")
    print(f"Kontroll raknade + ignorerade: {total_counted + total_ignored}")
    print()


def main() -> None:
    players, existing_pairs = parse_players_and_existing_pairs(PAIR_FILE)
    groups = make_groups(players)
    average, counted_pairs, ignored_pairs = average_elo_gap(groups, existing_pairs)

    print(f"Inlasta spelare: {len(players)}")
    print(f"Befintliga par i filen: {len(existing_pairs)}")
    print()
    print_group_details(groups, existing_pairs)
    print(f"Genomsnittligt elogap: {average:.2f}")
    print(f"Raknade par: {counted_pairs}")
    print(f"Ignorerade befintliga par: {ignored_pairs}")


if __name__ == "__main__":
    main()
