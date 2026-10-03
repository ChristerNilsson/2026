import json
import re
from pathlib import Path

from swiss import Player, Weights, pair_round


def load_personal_byes(path, entries):
    ids_by_name = {}
    for entry in entries:
        ids_by_name.setdefault(entry["name"], []).append(entry["id"])
    byes = {}
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = line.strip()
        if not line or line == "Personliga frironder":
            continue
        match = re.fullmatch(r"(.+?)\s+([1-9]\d*(?:\s+[1-9]\d*)*)", line)
        if match is None:
            raise ValueError(f"Ogiltig frirond på rad {line_number}: {line}")
        name, rounds = match.groups()
        matches = ids_by_name.get(name, [])
        if len(matches) != 1:
            raise ValueError(f"Namnet på rad {line_number} måste matcha en spelare: {name}")
        byes.setdefault(matches[0], set()).update(map(int, rounds.split()))
    return byes


def load_players(group, round_number, personal_byes=None, *, include_absent=False):
    personal_byes = personal_byes or {}
    ids_by_number = {p["number"]: p["id"] for p in group["players"]}
    players = []
    for entry in group["players"]:
        bye_rounds = personal_byes.get(entry["id"], set())
        if round_number in bye_rounds and not include_absent:
            continue
        history = [
            r for r in entry["rounds"]
            if r["paired"] and r["round"] < round_number and r["round"] not in bye_rounds
        ]
        players.append(Player(
            id=entry["id"],
            elo=entry["rating"],
            points=0.5 * sum(r < round_number for r in bye_rounds) + sum(
                r["result"] if r["result"] is not None
                else 0.5
                for r in history
            ),
            color_balance=sum(
                1 if r["color"] == "white" else -1 if r["color"] == "black" else 0
                for r in history if not r.get("resultText", "").lower().endswith("w")
            ),
            opponents=frozenset(
                ids_by_number[r["opponentNumber"]]
                for r in history if r["opponentNumber"] is not None
            ),
        ))
    return players


def format_player(player, entry):
    return (f"{entry['number']:>3}  {entry['name']:<30}  "
            f"{player.elo:>4}  {player.points:>5g}")


def format_player_overview(players, entries, weights, absent_ids=()):
    """Visa individuell statistik; totalen är inte en parkostnad."""
    groups = {}
    for player in players:
        groups.setdefault(player.points, []).append(player)
    lines = [
        "Spelaröversikt före lottning (inklusive personliga frironder)",
        "Index från 0, Elo fallande inom poänggruppen; lika Elo avgörs med spelar-id.",
        "Avstånd = |index - medelindex|; medelindex = (gruppstorlek - 1) / 2.",
        f"Individuell total = {weights.points:g} × poäng + {weights.rank:g} × avstånd "
        f"+ {weights.color:g} × |färgbalans|. Lottningen minimerar parkostnader.",
        f"{'Nr':>3}  {'Namn':<30}  {'Poäng':>5}  {'Färgbalans':>10}  "
        f"{'Index':>5}  {'Medelindex':>10}  {'Avstånd':>7}  {'Total':>7}  Status",
    ]
    for points in sorted(groups, reverse=True):
        group = sorted(groups[points], key=lambda p: (-p.elo, p.id))
        mean_index = (len(group) - 1) / 2
        for index, player in enumerate(group):
            distance = abs(index - mean_index)
            total = (weights.points * player.points + weights.rank * distance
                     + weights.color * abs(player.color_balance))
            entry = entries[player.id]
            status = "Personlig frirond" if player.id in absent_ids else "Spelar"
            lines.append(
                f"{entry['number']:>3}  {entry['name']:<30}  {player.points:>5g}  "
                f"{player.color_balance:>+10d}  {index:>5}  {mean_index:>10g}  "
                f"{distance:>7g}  {total:>7g}  {status}"
            )
    return "\n".join(lines)


def main():
    path = Path(__file__).with_name("19069.json")
    with path.open(encoding="utf-8") as source:
        data = json.load(source)

    personal_byes = load_personal_byes(
        path.with_suffix(".txt"),
        [entry for group in data["groups"] for entry in group["players"]],
    )
    for group in data["groups"]:
        round_number = max(1, group["nextRound"] - 1)
        all_players = load_players(group, round_number, personal_byes, include_absent=True)
        absent_ids = {p.id for p in all_players
                      if round_number in personal_byes.get(p.id, set())}
        players = [p for p in all_players if p.id not in absent_ids]
        entries = {p["id"]: p for p in group["players"]}
        print(f"{data['tournament']['name']} – rond {round_number}")
        absent = [p["name"] for p in group["players"]
                  if round_number in personal_byes.get(p["id"], set())]
        if absent:
            print("Personlig frirond (0.5 poäng): " + ", ".join(absent))
        if any(r["result"] is None and not r["bye"] for p in group["players"]
               for r in p["rounds"] if r["paired"] and r["round"] < round_number):
            print("Preliminär lottning: uppskjutna partier räknas tillfälligt som 0.5 poäng.")
        pairings = pair_round(players)
        print("\nLottning:")
        print("Vit: nr, namn, Elo, lottningspoäng | Svart: nr, namn, Elo, lottningspoäng")
        for game in pairings:
            print(f"{format_player(game.white, entries[game.white.id])} | "
                  f"{format_player(game.black, entries[game.black.id])}")


if __name__ == "__main__":
    main()
