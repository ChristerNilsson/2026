from __future__ import annotations

import argparse
import re
from pathlib import Path


DEFAULT_FILES = ("swiss-78.txt", "fairpair-78.txt")
OUTPUT_FILE = "resultat.txt"
PLAYER_COUNT = 78
BERGER_GROUP_COUNT = 8
BERGER_GROUP_SIZE = 9
ROUND_RE = re.compile(r"^[1-9]$")
ELO_RE = re.compile(r"^\d{4}$")


def read_lines(path: Path) -> list[str]:
    for encoding in ("utf-8", "cp1252"):
        try:
            return path.read_text(encoding=encoding).splitlines()
        except UnicodeDecodeError:
            pass
    return path.read_text().splitlines()


def parse_table(path: Path) -> tuple[dict[int, int], set[tuple[int, int]]]:
    elos: dict[int, int] = {}
    pairings: set[tuple[int, int]] = set()

    for line in read_lines(path):
        tokens = line.split()
        if len(tokens) < PLAYER_COUNT + 2:
            continue

        try:
            player = int(tokens[0])
        except ValueError:
            continue

        if not 1 <= player <= PLAYER_COUNT:
            continue

        elo = next((int(token) for token in reversed(tokens) if ELO_RE.match(token)), None)
        if elo is None:
            continue

        elos[player] = elo
        opponents = tokens[1 : PLAYER_COUNT + 1]
        if len(opponents) != PLAYER_COUNT:
            raise ValueError(f"Expected {PLAYER_COUNT} opponents on row {player} in {path}")

        for index, value in enumerate(opponents, start=1):
            if ROUND_RE.match(value):
                pairings.add(tuple(sorted((player, index))))

    if len(elos) != PLAYER_COUNT:
        raise ValueError(f"Expected {PLAYER_COUNT} player rows in {path}, found {len(elos)}")

    return elos, pairings


def average_gap(elos: dict[int, int], pairings: set[tuple[int, int]], label: str) -> tuple[float, int]:
    if not pairings:
        raise ValueError(f"No pairings found for {label}")

    total = sum(abs(elos[player1] - elos[player2]) for player1, player2 in pairings)
    return total / len(pairings), len(pairings)


def player_gap_stats(
    elos: dict[int, int],
    pairings: set[tuple[int, int]],
) -> dict[int, tuple[int, int, float]]:
    gaps: dict[int, list[int]] = {player: [] for player in elos}

    for player1, player2 in pairings:
        gap = abs(elos[player1] - elos[player2])
        gaps[player1].append(gap)
        gaps[player2].append(gap)

    return {
        player: (sum(player_gaps), len(player_gaps), sum(player_gaps) / len(player_gaps))
        for player, player_gaps in gaps.items()
        if player_gaps
    }


def average_elo_gap(path: Path) -> tuple[float, int]:
    elos, pairings = parse_table(path)
    return average_gap(elos, pairings, str(path))


def berger_pairings(
    group_count: int = BERGER_GROUP_COUNT,
    group_size: int = BERGER_GROUP_SIZE,
) -> set[tuple[int, int]]:
    pairings: set[tuple[int, int]] = set()

    for group_index in range(group_count):
        first_player = group_index * group_size + 1
        last_player = first_player + group_size
        players = range(first_player, last_player)

        for player1 in players:
            for player2 in range(player1 + 1, last_player):
                pairings.add((player1, player2))

    return pairings


def average_berger_elo_gap(path: Path) -> tuple[float, int]:
    elos, _ = parse_table(path)
    return average_gap(elos, berger_pairings(), "Berger groups")


def format_result(
    label: str,
    average: float,
    pairing_count: int,
    elos: dict[int, int],
    stats: dict[int, tuple[int, int, float]],
) -> list[str]:
    lines = [
        f"{label}: {average:.1f} ({pairing_count} pairings)",
        "Spelare elo   totalgap antal medelgap",
    ]

    for player, (player_total_gap, player_pairing_count, player_average) in sorted(stats.items()):
        lines.append(
            f"{player:>7} {elos[player]:>4} {player_total_gap:>10} "
            f"{player_pairing_count:>5} {player_average:>8.1f}"
        )

    lines.append("")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Calculate average absolute Elo gaps."
    )
    parser.add_argument(
        "files",
        nargs="*",
        default=DEFAULT_FILES,
        help="Pairing table files to calculate. Defaults to swiss-78.txt and fairpair-78.txt.",
    )
    args = parser.parse_args()
    output_lines: list[str] = []

    for filename in args.files:
        path = Path(filename)
        elos, pairings = parse_table(path)
        average, pairing_count = average_gap(elos, pairings, str(path))
        output_lines.extend(
            format_result(
                path.name,
                average,
                pairing_count,
                elos,
                player_gap_stats(elos, pairings),
            )
        )

    elos, _ = parse_table(Path(args.files[0]))
    pairings = berger_pairings()
    berger_average, berger_pairing_count = average_gap(elos, pairings, "Berger groups")
    output_lines.extend(
        format_result(
            f"berger groups ({BERGER_GROUP_COUNT} groups of {BERGER_GROUP_SIZE})",
            berger_average,
            berger_pairing_count,
            elos,
            player_gap_stats(elos, pairings),
        )
    )
    Path(OUTPUT_FILE).write_text("\n".join(output_lines), encoding="utf-8")


if __name__ == "__main__":
    main()
