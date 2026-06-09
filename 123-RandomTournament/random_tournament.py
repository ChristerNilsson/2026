from __future__ import annotations

import argparse
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Game:
    round_number: int
    player_a: int
    player_b: int

    @property
    def distance(self) -> int:
        return abs(self.player_a - self.player_b)


def create_round(
    players: list[int],
    previous_pairs: set[tuple[int, int]],
    rng: random.Random,
    attempts: int = 10_000,
) -> list[tuple[int, int]]:
    if len(players) % 2 != 0:
        raise ValueError("Antal spelare maste vara jamnt.")

    best_pairs: list[tuple[int, int]] | None = None
    best_repeats = len(players)

    for _ in range(attempts):
        shuffled = players[:]
        rng.shuffle(shuffled)
        pairs = [
            tuple(sorted((shuffled[i], shuffled[i + 1])))
            for i in range(0, len(shuffled), 2)
        ]
        repeats = sum(pair in previous_pairs for pair in pairs)

        if repeats == 0:
            return pairs

        if repeats < best_repeats:
            best_pairs = pairs
            best_repeats = repeats

    if best_pairs is None:
        raise RuntimeError("Kunde inte skapa en rond.")

    return best_pairs


def create_tournament(
    player_count: int,
    round_count: int,
    seed: int | None = None,
) -> list[Game]:
    players = list(range(1, player_count + 1))
    previous_pairs: set[tuple[int, int]] = set()
    games: list[Game] = []
    rng = random.Random(seed)
    total = 0

    for round_number in range(1, round_count + 1):
        pairs = create_round(players, previous_pairs, rng)
        print(f"Round {round_number}: {pairs}")
        for player_a, player_b in pairs:
            previous_pairs.add((player_a, player_b))
            total += abs(player_a - player_b)
            games.append(Game(round_number, player_a, player_b))
    print(f"avg avstand: {total/140:.2f}")    
    return games


def create_berger_group(players: list[int]) -> list[list[tuple[int, int]]]:
    if len(players) % 2 != 0:
        raise ValueError("Antal spelare i en Bergergrupp maste vara jamnt.")

    rotating = players[:]
    rounds: list[list[tuple[int, int]]] = []

    for _ in range(len(players) - 1):
        pairs = [
            tuple(sorted((rotating[i], rotating[-i - 1])))
            for i in range(len(players) // 2)
        ]
        rounds.append(pairs)
        rotating = [rotating[0], rotating[-1], *rotating[1:-1]]

    return rounds


def create_berger_tournament(
    player_count: int,
    round_count: int,
    group_size: int = 8,
) -> list[Game]:
    if player_count % group_size != 0:
        raise ValueError("Antal spelare maste vara delbart med 8 for Berger.")
    if round_count > group_size - 1:
        raise ValueError("Berger med grupper om 8 kan ha max 7 ronder.")

    games: list[Game] = []
    groups = [
        list(range(start, start + group_size))
        for start in range(1, player_count + 1, group_size)
    ]

    for group in groups:
        group_rounds = create_berger_group(group)
        for round_index, pairs in enumerate(group_rounds[:round_count], start=1):
            for player_a, player_b in pairs:
                games.append(Game(round_index, player_a, player_b))

    return games


def create_swiss_round(
    scores: dict[int, float],
    previous_pairs: set[tuple[int, int]],
) -> list[tuple[int, int]]:
    ordered_players = sorted(scores, key=lambda player: (-scores[player], player))
    unpaired = ordered_players[:]
    pairs: list[tuple[int, int]] = []

    while unpaired:
        player_a = unpaired.pop(0)
        opponent_index = next(
            (
                index
                for index, player_b in enumerate(unpaired)
                if tuple(sorted((player_a, player_b))) not in previous_pairs
            ),
            0,
        )
        player_b = unpaired.pop(opponent_index)
        pairs.append(tuple(sorted((player_a, player_b))))

    return pairs


def update_swiss_scores(
    scores: dict[int, float],
    pairs: list[tuple[int, int]],
    rng: random.Random,
) -> None:
    for player_a, player_b in pairs:
        result = rng.choice(("a", "b", "draw"))
        if result == "a":
            scores[player_a] += 1
        elif result == "b":
            scores[player_b] += 1
        else:
            scores[player_a] += 0.5
            scores[player_b] += 0.5


def create_swiss_tournament(
    player_count: int,
    round_count: int,
    seed: int | None = None,
) -> list[Game]:
    if player_count % 2 != 0:
        raise ValueError("Antal spelare maste vara jamnt.")

    rng = random.Random(seed)
    scores = {player: 0.0 for player in range(1, player_count + 1)}
    previous_pairs: set[tuple[int, int]] = set()
    games: list[Game] = []

    for round_number in range(1, round_count + 1):
        pairs = create_swiss_round(scores, previous_pairs)
        for player_a, player_b in pairs:
            previous_pairs.add((player_a, player_b))
            games.append(Game(round_number, player_a, player_b))
        update_swiss_scores(scores, pairs, rng)

    return games


def create_matrix(player_count: int, games: list[Game]) -> list[list[str]]:
    matrix = [["." for _ in range(player_count)] for _ in range(player_count)]

    for game in games:
        row = game.player_a - 1
        col = game.player_b - 1
        matrix[row][col] = str(game.round_number)
        matrix[col][row] = str(game.round_number)

    return matrix


def average_distance(games: list[Game]) -> float:
    if not games:
        return 0.0

    return sum(game.distance for game in games) / len(games)


def print_matrix(matrix: list[list[str]]) -> None:
    player_count = len(matrix)
    width = 1
    cell_width = 1

    header = " " * (width + 1)
    header += " ".join(
        f"{player % 10:>{cell_width}}" for player in range(1, player_count + 1)
    )
    print(header)

    for player, row in enumerate(matrix, start=1):
        cells = " ".join(f"{cell:>{cell_width}}" for cell in row)
        print(f"{player % 10:>{width}} {cells}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Skapa en turnering dar paren bildas genom lottning."
    )
    parser.add_argument(
        "--type",
        choices=("berger", "random", "swiss"),
        default="random",
        help="Turneringstyp.",
    )
    parser.add_argument("--players", type=int, default=24, help="Antal spelare.")
    parser.add_argument("--rounds", type=int, default=5, help="Antal ronder.")
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Slumptalsfro for reproducerbar lottning.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.type == "berger":
        games = create_berger_tournament(args.players, args.rounds)
    elif args.type == "swiss":
        games = create_swiss_tournament(args.players, args.rounds, args.seed)
    else:
        games = create_tournament(args.players, args.rounds, args.seed)
    matrix = create_matrix(args.players, games)

    print_matrix(matrix)
    print()
    print(f"Genomsnittligt avstand: {average_distance(games):.2f}")


if __name__ == "__main__":
    main()
