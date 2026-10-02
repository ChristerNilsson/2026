import unittest
from pathlib import Path

from main import format_player, format_player_overview, load_players, load_personal_byes
from swiss import Player, Weights


class MainTests(unittest.TestCase):
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
