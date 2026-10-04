import json
import re
from pathlib import Path

from swiss import Player, Weights, pair_round, pairing_order


def load_absences(path, entries):
    ids_by_name = {}
    for entry in entries:
        ids_by_name.setdefault(entry["name"], []).append(entry["id"])
    byes = {}
    withdrawals = {}
    section = "byes"
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        if line == "Personliga frironder":
            section = "byes"
            continue
        if re.fullmatch(r"Strukna spelare\s+fr o m", line):
            section = "withdrawals"
            continue
        match = re.fullmatch(r"(.+?)\s+([1-9]\d*(?:\s+[1-9]\d*)*)", line)
        if match is None:
            raise ValueError(f"Ogiltig frånvaro på rad {line_number}: {line}")
        name, rounds = match.groups()
        matches = ids_by_name.get(name, [])
        if len(matches) != 1:
            raise ValueError(f"Namnet på rad {line_number} måste matcha en spelare: {name}")
        numbers = list(map(int, rounds.split()))
        if section == "withdrawals":
            if len(numbers) != 1 or matches[0] in withdrawals:
                raise ValueError(f"Ange en enda strykningsrond per spelare på rad {line_number}.")
            withdrawals[matches[0]] = numbers[0]
        else:
            byes.setdefault(matches[0], set()).update(numbers)
    return byes, withdrawals


def load_personal_byes(path, entries):
    return load_absences(path, entries)[0]


def load_float_history(group, round_number, personal_byes=None):
    """Rond 1 ligger på index 0; jämför poängen före respektive rond.

    Uppskjutna resultat räknas preliminärt som 0.5, liksom i lottningen.
    FIDE Dutch 2026-02-01, artiklarna 1.4.2–1.4.4.
    """
    personal_byes = personal_byes or {}
    entries = {p["number"]: p for p in group["players"]}
    rounds = {p["id"]: {r["round"]: r for r in p["rounds"]}
              for p in entries.values()}
    scores = {p["id"]: 0 for p in entries.values()}
    history = {p["id"]: [] for p in entries.values()}
    for number in range(1, round_number):
        gains = {}
        for entry in entries.values():
            pid = entry["id"]
            record = rounds[pid].get(number)
            direction, gain = "none", 0
            if number in personal_byes.get(pid, set()):
                direction, gain = "down", 0.5
            elif record and record["paired"]:
                gain = record["result"] if record["result"] is not None else 0.5
                unplayed = (record.get("bye", False)
                            or record["opponentNumber"] is None
                            or record.get("resultText", "").lower().endswith("w"))
                if unplayed:
                    if record.get("bye", False) or gain > 0:
                        direction = "down"
                else:
                    opponent = entries[record["opponentNumber"]]["id"]
                    if scores[pid] != scores[opponent]:
                        direction = "down" if scores[pid] > scores[opponent] else "up"
            history[pid].append(direction)
            gains[pid] = gain
        for pid, gain in gains.items():
            scores[pid] += gain
    history = {pid: tuple(values) for pid, values in history.items()}
    return history


def load_players(group, round_number, personal_byes=None, *, include_absent=False,
                 withdrawals=None):
    personal_byes = personal_byes or {}
    ids_by_number = {p["number"]: p["id"] for p in group["players"]}
    float_histories = load_float_history(group, round_number, personal_byes)
    initial_color = group.get("initialColor")
    if initial_color is None:
        initial_color = "white"
        for entry in sorted(group["players"], key=lambda p: p.get("pairingNumber", p["number"])):
            first = next((r for r in entry["rounds"] if r["round"] == 1), None)
            if (first and first["paired"] and first["color"] in ("white", "black")
                    and first["opponentNumber"] is not None
                    and entry.get("pairingNumber", entry["number"]) < next(
                        p.get("pairingNumber", p["number"]) for p in group["players"]
                        if p["number"] == first["opponentNumber"])):
                initial_color = first["color"] if entry.get("pairingNumber", entry["number"]) % 2 else (
                    "black" if first["color"] == "white" else "white")
                break
    players = []
    for entry in group["players"]:
        if round_number >= (withdrawals or {}).get(entry["id"], float("inf")):
            continue
        bye_rounds = personal_byes.get(entry["id"], set())
        if round_number in bye_rounds and not include_absent:
            continue
        history = [
            r for r in entry["rounds"]
            if r["paired"] and r["round"] < round_number and r["round"] not in bye_rounds
        ]
        float_history = float_histories[entry["id"]]
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
            upfloat_count=float_history.count("up"),
            downfloat_count=float_history.count("down"),
            float_history=float_history,
            color_history=tuple(r["color"] for r in sorted(history, key=lambda r: r["round"])
                                if r["color"] in ("white", "black")
                                and not r.get("bye", False)
                                and r["opponentNumber"] is not None
                                and not r.get("resultText", "").lower().endswith("w")),
            pairing_number=entry.get("pairingNumber", entry["number"]),
            initial_color=initial_color,
        ))
    return players


def pair_with_bye(players, entries, round_number, personal_byes, *, on_group=None,
                  on_matrix=None):
    """Välj lägsta poäng, därefter högsta lottningsnummer, med full lottning.

    Tidigare lottningsfrirond eller full poäng utan spel utesluter ny frirond.
    """
    if len(players) % 2 == 0:
        return pair_round(players, on_group=on_group, on_matrix=on_matrix), None
    for candidate in sorted(players, key=lambda p: (p.points,
                            -(p.pairing_number if p.pairing_number is not None else 0),
                            p.elo, p.id)):
        if any(r["round"] < round_number and r["paired"]
               and r["round"] not in personal_byes.get(candidate.id, set())
               and (r.get("bye", False) or (
                   r["result"] == 1 and (r["opponentNumber"] is None
                   or r.get("resultText", "").lower().endswith("w"))))
               for r in entries[candidate.id]["rounds"]):
            continue
        try:
            if on_group is not None:
                print("\nTrace: provar lottningsfrirond för " + entries[candidate.id]["name"])
            games = pair_round([p for p in players if p.id != candidate.id],
                               on_group=on_group, on_matrix=on_matrix)
        except ValueError:
            continue
        return games, candidate
    raise ValueError("Ingen tillåten lottningsfrirond med fullständig lottning finns.")


def format_player(player, entry):
    return (f"{entry['number']:>3}  {entry['name']:<30}  "
            f"{player.elo:>4}  {player.points:>5g}")


def trace_group(group_points, players, pairings, entries):
    print(f"\nTrace: grupp {group_points:.1f}, {len(players)} spelare (lottningsnummer stigande)")
    for player in players:
        print(format_player(player, entries[player.id])
              + "  " + ("".join("W" if c == "white" else "B"
                                for c in player.color_history) or "–")
              + f" {player.color_balance:+d}"
              + "  Motståndare: " + (", ".join(
                  str(number) for number in sorted(
                      entries[opponent_id]["number"] for opponent_id in player.opponents
                  )) or "–"))
    if pairings is None:
        print("Ingen fullständig matchning; utökar med två spelare från lägre grupp.")
    else:
        print(f"Matchning lyckades: {len(pairings)} partier, "
              f"total parkostnad {sum(game.cost for game in pairings):g}")
        for game in pairings:
            white_history = "".join("W" if c == "white" else "B"
                                    for c in game.white.color_history) or "–"
            black_history = "".join("W" if c == "white" else "B"
                                    for c in game.black.color_history) or "–"
            print(f"{entries[game.white.id]['number']}-{entries[game.black.id]['number']}"
                  + f" {game.cost:.2f} {white_history} {black_history}")


def trace_matrix(points, matrix, entries):
    numbers = [entries[p.id]["number"] for p in matrix.players]
    print(f"\nKostnadsmatris för grupp {points:.1f} (rader/kolumner = spelarnr)")
    print("– = otillåtet par; delkostnaderna är viktade och summeras till totalen.")
    for component, title in enumerate(("Färgönskemål", "Starka färgönskemål",
                                       "Rankavstånd", "Färgbalans", "Total")):
        values = []
        for i, row in enumerate(matrix.cells):
            values.append([
                "–" if cost is None else f"{float(cost if component == 4 else matrix.components[i][j][component]):.2f}"
                for j, cost in enumerate(row)
            ])
        width = max(6, max((len(value) for row in values for value in row), default=0))
        print(title)
        print("    " + " ".join(f"{number:>{width}}" for number in numbers))
        for number, row in zip(numbers, values):
            print(f"{number:>3} " + " ".join(f"{value:>{width}}" for value in row))


def format_player_overview(players, entries, weights, absent_ids=()):
    """Visa individuell statistik; totalen är inte en parkostnad."""
    groups = {}
    for player in players:
        groups.setdefault(player.points, []).append(player)
    lines = [
        "Spelaröversikt före lottning (inklusive personliga frironder)",
        "Index från 0, lottningsnummer stigande inom poänggruppen.",
        "Avstånd = |index - medelindex|; medelindex = (gruppstorlek - 1) / 2.",
        f"Individuell total = {weights.points:g} × poäng + {weights.rank:g} × avstånd "
        f"+ {weights.color:g} × |färgbalans|. Lottningen minimerar parkostnader.",
        f"{'Nr':>3}  {'Namn':<30}  {'Poäng':>5}  {'Färgbalans':>10}  "
        f"{'Index':>5}  {'Medelindex':>10}  {'Avstånd':>7}  {'Total':>7}  Status",
    ]
    for points in sorted(groups, reverse=True):
        group = sorted(groups[points], key=pairing_order)
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

    personal_byes, withdrawals = load_absences(
        path.with_suffix(".txt"),
        [entry for group in data["groups"] for entry in group["players"]],
    )
    for group in data["groups"]:
        round_number = max(1, group["nextRound"] - 1)
        all_players = load_players(group, round_number, personal_byes, include_absent=True,
                                   withdrawals=withdrawals)
        absent_ids = {p.id for p in all_players
                      if round_number in personal_byes.get(p.id, set())}
        players = [p for p in all_players if p.id not in absent_ids]
        entries = {p["id"]: p for p in group["players"]}
        print(f"{data['tournament']['name']} – rond {round_number}")
        withdrawn = [p["name"] for p in group["players"]
                     if round_number >= withdrawals.get(p["id"], float("inf"))]
        if withdrawn:
            print("Strukna spelare: " + ", ".join(withdrawn))
        absent = [p["name"] for p in group["players"]
                  if p["id"] in absent_ids]
        if absent:
            print("Personlig frirond (0.5 poäng): " + ", ".join(absent))
        if any(r["result"] is None and not r["bye"] for p in group["players"]
               for r in p["rounds"] if r["paired"] and r["round"] < round_number):
            print("Preliminär lottning: uppskjutna partier räknas tillfälligt som 0.5 poäng.")
        print("\n" + format_player_overview(all_players, entries, Weights(), absent_ids))
        pairings, bye = pair_with_bye(
            players, entries, round_number, personal_byes,
            on_group=lambda points, members, games: trace_group(points, members, games, entries),
            on_matrix=lambda points, matrix: trace_matrix(points, matrix, entries),
        )
        if bye is not None:
            print("Lottningsfrirond (1 poäng): " + entries[bye.id]["name"])
        print("\nLottning:")
        print("Vit: nr, namn, Elo, lottningspoäng | Svart: nr, namn, Elo, lottningspoäng")
        for game in pairings:
            print(f"{format_player(game.white, entries[game.white.id])} | "
                  f"{format_player(game.black, entries[game.black.id])}")


if __name__ == "__main__":
    main()
