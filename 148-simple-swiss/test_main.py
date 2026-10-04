import unittest
from tempfile import TemporaryDirectory
from pathlib import Path

from main import (format_player, format_player_overview, load_players,
                  load_personal_byes, load_float_history, load_absences, pair_with_bye)
from swiss import Player, Weights


class MainTests(unittest.TestCase):
    def test_legacy_player_numbers_remain_valid_without_pairing_numbers(self):
        import json
        path = Path(__file__).with_name("19069.json")
        group = json.loads(path.read_text(encoding="utf-8"))["groups"][0]
        # Kontrollera bakåtkompatibilitet för äldre underlag utan lottningsnummer.
        for entry in group["players"]:
            entry.pop("pairingNumber", None)
        byes, withdrawals = load_absences(path.with_suffix(".txt"), group["players"])
        entries = {p["id"]: p for p in group["players"]}
        players = load_players(group, 5, byes, withdrawals=withdrawals)
        games, _ = pair_with_bye(players, entries, 5, byes)
        self.assertEqual({p.pairing_number for p in players},
                         {entries[p.id]["number"] for p in players})
        for game in games:
            self.assertNotIn(game.black.id, game.white.opponents)
            self.assertNotIn(game.white.id, game.black.opponents)

    def test_pairing_numbers_reproduce_bbp_two_point_group(self):
        import json
        path = Path(__file__).with_name("19069.json")
        group = json.loads(path.read_text(encoding="utf-8"))["groups"][0]
        byes, withdrawals = load_absences(path.with_suffix(".txt"), group["players"])
        players = load_players(group, 5, byes, withdrawals=withdrawals)
        self.assertEqual(len({p["pairingNumber"] for p in group["players"]}), 54)
        entries = {p["id"]: p for p in group["players"]}
        games, _ = pair_with_bye(players, entries, 5, byes)
        self.assertEqual({(g.white.pairing_number, g.black.pairing_number)
                          for g in games if g.white.points == g.black.points == 2},
                         {(33, 16), (38, 17), (41, 18), (20, 34), (29, 39), (31, 42)})
        self.assertEqual(next(p for p in players if p.pairing_number == 16).id,
                         next(p["id"] for p in group["players"] if p["number"] == 23))

    def test_withdrawals_start_at_given_round_and_preserve_opponent_history(self):
        group = {"players": [
            {"number": 1, "id": "a", "name": "Anna", "rating": 2000,
             "rounds": [{"round": 1, "paired": True, "result": 1,
                         "color": "white", "opponentNumber": 2}]},
            {"number": 2, "id": "b", "name": "Bo", "rating": 1900, "rounds": []},
        ]}
        with TemporaryDirectory() as directory:
            path = Path(directory) / "absences.txt"
            path.write_text("Personliga frironder\nBo 1\n\nStrukna spelare       fr o m\nBo 3\n",
                            encoding="utf-8")
            byes, withdrawals = load_absences(path, group["players"])
        self.assertEqual(byes, {"b": {1}})
        self.assertEqual(withdrawals, {"b": 3})
        self.assertEqual(len(load_players(group, 2, byes, withdrawals=withdrawals)), 2)
        players = load_players(group, 3, byes, include_absent=True, withdrawals=withdrawals)
        self.assertEqual([p.id for p in players], ["a"])
        self.assertEqual(players[0].opponents, frozenset({"b"}))

    def test_pairing_bye_skips_previous_full_unplayed_point(self):
        players = [Player("a", 1700), Player("b", 1800), Player("c", 1900)]
        entries = {p.id: {"rounds": []} for p in players}
        entries["a"]["rounds"] = [{"round": 1, "paired": True, "result": 1,
                                      "opponentNumber": None, "bye": True}]
        games, bye = pair_with_bye(players, entries, 2, {})
        self.assertEqual(bye.id, "b")
        self.assertEqual({games[0].white.id, games[0].black.id}, {"a", "c"})

    def test_float_history_uses_scores_before_round_and_unplayed_points(self):
        def record(number, opponent, result, text=""):
            return {"round": number, "paired": True, "opponentNumber": opponent,
                    "result": result, "resultText": text, "color": "white"}
        group = {"players": [
            {"number": 1, "id": "a", "rounds": [record(1, 2, 1), record(2, 2, 0),
                                                     record(3, 2, 1, "1w")]},
            {"number": 2, "id": "b", "rounds": [record(1, 1, 0), record(2, 1, 1),
                                                     record(3, 1, 0, "0w")]},
        ]}
        history = load_float_history(group, 5, {"b": {4}})
        self.assertEqual(history["a"], ("none", "down", "down", "none"))
        self.assertEqual(history["b"], ("none", "up", "none", "down"))
        self.assertEqual(load_float_history(group, 1), {"a": (), "b": ()})

    def test_walkovers_do_not_affect_color_balance(self):
        for color in ("white", "black"):
            for result_text, result in (("1w", 1), ("0w", 0)):
                with self.subTest(color=color, result=result_text):
                    rounds = [
                        {"round": 1, "paired": True, "result": 0.5,
                         "resultText": "½", "color": "white", "opponentNumber": 2},
                        {"round": 2, "paired": True, "result": result,
                         "resultText": result_text, "color": color, "opponentNumber": 2},
                    ]
                    group = {"players": [
                        {"number": 1, "id": "a", "rating": 2000, "rounds": rounds},
                        {"number": 2, "id": "b", "rating": 1900, "rounds": []},
                    ]}
                    player = load_players(group, 3)[0]
                    self.assertEqual(player.color_balance, 1)
                    self.assertEqual(player.points, 0.5 + result)
                    self.assertEqual(player.opponents, frozenset({"b"}))
                    self.assertEqual(player.color_history, ("white",))

    def test_overview_group_midpoints_weights_and_absence(self):
        players = [Player("a", 2000, 2, -2), Player("b", 2000, 2, 1),
                   Player("c", 1800, 1, 0)]
        entries = {p.id: {"number": i + 1, "name": p.id}
                   for i, p in enumerate(players)}
        output = format_player_overview(players, entries, Weights(10, 2, 3), {"b"})
        rows = [line.split() for line in output.splitlines() if line.split()[0].isdigit()]
        self.assertEqual(rows, [
            ["1", "a", "2", "-2", "0", "0.5", "0.5", "27", "Spelar"],
            ["2", "b", "2", "+1", "1", "0.5", "0.5", "24", "Personlig", "frirond"],
            ["3", "c", "1", "+0", "0", "0", "0", "10", "Spelar"],
        ])

    def test_personal_byes_exclude_current_round_and_count_previous_once(self):
        entry = {"number": 1, "id": "a", "name": "Anna", "rating": 2000,
                 "rounds": [{"round": 1, "paired": True, "result": None,
                             "color": None, "opponentNumber": None}]}
        group = {"players": [entry]}
        byes = {"a": {1, 3}}
        self.assertEqual(load_players(group, 3, byes), [])
        player = load_players(group, 4, byes)[0]
        self.assertEqual(player.points, 1)
        self.assertEqual(player.color_balance, 0)
        self.assertEqual(player.opponents, frozenset())

    def test_tournament_personal_byes(self):
        import json
        path = Path(__file__).with_name("19069.json")
        group = json.loads(path.read_text(encoding="utf-8"))["groups"][0]
        byes = load_personal_byes(path.with_suffix(".txt"), group["players"])
        self.assertEqual(len(byes), 17)
        players = load_players(group, 5, byes)
        self.assertEqual(len(players), 48)
        absent_ids = {p["id"] for p in group["players"]} - {p.id for p in players}
        self.assertEqual(absent_ids, {pid for pid, rounds in byes.items() if 5 in rounds})

    def test_postponed_results_count_half_only_in_previous_paired_rounds(self):
        rounds = [
            {"round": number, "paired": paired, "result": result,
             "color": "white", "opponentNumber": None}
            for number, paired, result in
            [(1, True, 1), (2, True, None), (3, True, 0),
             (4, False, None), (5, True, None)]
        ]
        entry = {"number": 7, "id": "a", "name": "Anna",
                 "rating": 2100, "rounds": rounds}
        player = load_players({"players": [entry]}, 5)[0]
        self.assertEqual(player.points, 1.5)
        self.assertIsNone(rounds[1]["result"])
        self.assertEqual(format_player(player, entry).split(),
                         ["7", "Anna", "2100", "1.5"])


if __name__ == "__main__":
    unittest.main()
