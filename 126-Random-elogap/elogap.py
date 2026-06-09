import argparse
import random
from pathlib import Path


TOURNAMENT_FILE = Path("fairpair.txt")
ROUND_COUNT = 7


def read_tournament(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        raise ValueError("Tom turneringsfil")

    player_count = len(lines[0].split())
    elos = []
    existing_pairs = set()

    for player_index, line in enumerate(lines[1:], start=0):
        parts = line.split()
        if len(parts) < 2:
            continue

        try:
            elo = int(parts[-1])
        except ValueError as exc:
            raise ValueError(f"Kunde inte läsa Elo på rad {player_index + 2}") from exc

        elos.append(elo)
        pair_cells = line[4 : 4 + player_count * 2 : 2]
        if len(pair_cells) != player_count:
            raise ValueError(f"Saknar parkolumner på rad {player_index + 2}")

        for opponent_index, cell in enumerate(pair_cells):
            if player_index < opponent_index and cell.isdigit():
                existing_pairs.add((player_index, opponent_index))

    if len(elos) != player_count:
        raise ValueError(f"Förväntade {player_count} spelare, hittade {len(elos)}")

    if player_count % 2:
        raise ValueError("Antalet spelare måste vara jämnt")

    return elos, existing_pairs


def normalize_pair(first, second):
    return (first, second) if first < second else (second, first)


def make_round(available_players, forbidden_pairs, rng):
    if not available_players:
        return []

    players = list(available_players)
    rng.shuffle(players)
    first = players[0]
    candidates = players[1:]
    rng.shuffle(candidates)

    for second in candidates:
        pair = normalize_pair(first, second)
        if pair in forbidden_pairs:
            continue

        remaining = [player for player in available_players if player not in pair]
        rest = make_round(remaining, forbidden_pairs, rng)
        if rest is not None:
            return [pair] + rest

    return None


def make_random_rounds(player_count, existing_pairs, rng, round_count=ROUND_COUNT):
    rounds = []
    forbidden_pairs = set(existing_pairs)
    players = list(range(player_count))

    for round_number in range(1, round_count + 1):
        pairing = make_round(players, forbidden_pairs, rng)
        if pairing is None:
            raise ValueError(f"Kunde inte slumpa rond {round_number} utan förbjudna par")

        rounds.append(pairing)
        forbidden_pairs.update(pairing)

    return rounds


def average_elo_gap(elos, rounds):
    gaps = [
        abs(elos[first] - elos[second])
        for pairing in rounds
        for first, second in pairing
    ]

    if not gaps:
        raise ValueError("Hittade inga slumpade par")

    return sum(gaps) / len(gaps), len(gaps)


def format_pair(pair, elos):
    first, second = pair
    gap = abs(elos[first] - elos[second])
    return f"{first + 1}-{second + 1} ({elos[first]}-{elos[second]}, gap {gap})"


def main():
    parser = argparse.ArgumentParser(
        description="Slumpar sju ronder och räknar genomsnittligt elogap."
    )
    parser.add_argument(
        "--fil",
        type=Path,
        default=TOURNAMENT_FILE,
        help="FairPair-filen att läsa, standard: fairpair.txt",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Seed för reproducerbar slumpning",
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    elos, existing_pairs = read_tournament(args.fil)
    rounds = make_random_rounds(len(elos), existing_pairs, rng)
    average, game_count = average_elo_gap(elos, rounds)

    for round_number, pairing in enumerate(rounds, start=1):
        pairs = ", ".join(format_pair(pair, elos) for pair in pairing)
        print(f"Rond {round_number}: {pairs}")

    print(f"Antal slumpade partier: {game_count}")
    print(f"Ignorerade befintliga par: {len(existing_pairs)}")
    print(f"Genomsnittligt elogap: {average:.2f}")


if __name__ == "__main__":
    main()
