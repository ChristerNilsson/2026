from __future__ import annotations

import re
from pathlib import Path


PLAYER_ROW = re.compile(r"^\s*(\d+)\s+(\d+)\s+")


def read_tournament(path: Path) -> tuple[dict[int, int], dict[int, list[str]]]:
    rows: dict[int, list[str]] = {}
    ratings: dict[int, int] = {}

    for line in path.read_text(encoding="utf-8").splitlines():
        if not PLAYER_ROW.match(line):
            continue

        parts = line.split()
        player = int(parts[0])
        ratings[player] = int(parts[1])
        rows[player] = parts

    player_count = len(rows)
    if player_count == 0:
        raise ValueError(f"Hittade inga spelarrader i {path}")

    opponents: dict[int, list[str]] = {}
    for player, parts in rows.items():
        cells = parts[2 : 2 + player_count]
        if len(cells) != player_count:
            raise ValueError(
                f"Rad {player} har {len(cells)} motståndarkolumner, "
                f"förväntade {player_count}"
            )
        opponents[player] = cells

    return ratings, opponents


def average_elo_gap(path: Path) -> tuple[float, int, int]:
    ratings, opponents = read_tournament(path)
    gaps: list[int] = []

    for player, cells in opponents.items():
        for opponent, cell in enumerate(cells, start=1):
            if opponent <= player:
                continue
            if cell.isdigit():
                gaps.append(abs(ratings[player] - ratings[opponent]))

    if not gaps:
        raise ValueError("Hittade inga spelade partier i tabellen")

    return sum(gaps) / len(gaps), sum(gaps), len(gaps)


def main() -> None:
    average, total, games = average_elo_gap(Path("tasaselo.txt"))
    print(f"Antal partier: {games}")
    print(f"Summa elogap: {total}")
    print(f"Genomsnittligt elogap: {average:.2f}")


if __name__ == "__main__":
    main()
