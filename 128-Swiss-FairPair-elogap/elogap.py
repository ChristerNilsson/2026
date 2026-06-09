from __future__ import annotations

import argparse
import re
from pathlib import Path


DEFAULT_FILES = ("swiss-78.txt", "fairpair-78.txt")
PLAYER_COUNT = 78
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


def average_elo_gap(path: Path) -> tuple[float, int]:
    elos, pairings = parse_table(path)
    if not pairings:
        raise ValueError(f"No pairings found in {path}")

    total = sum(abs(elos[player1] - elos[player2]) for player1, player2 in pairings)
    return total / len(pairings), len(pairings)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Calculate the average absolute Elo gap in pairing tables."
    )
    parser.add_argument(
        "files",
        nargs="*",
        default=DEFAULT_FILES,
        help="Pairing table files to calculate. Defaults to swiss-78.txt and fairpair-78.txt.",
    )
    args = parser.parse_args()

    for filename in args.files:
        path = Path(filename)
        average, pairing_count = average_elo_gap(path)
        print(f"{path.name}: {average:.1f} ({pairing_count} pairings)")


if __name__ == "__main__":
    main()
