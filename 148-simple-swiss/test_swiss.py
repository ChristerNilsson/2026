import unittest
from fractions import Fraction
from unittest.mock import patch

from swiss import Player, cost_matrix, pair_round, pairing_restrictions, score_groups


class SwissTests(unittest.TestCase):
    def test_restrictions_report_both_rules_and_asymmetric_history(self):
        a = Player("a", 2000, color_balance=1)
        b = Player("b", 1900, color_balance=1, opponents=frozenset({"a"}))
        reasons = pairing_restrictions(a, b)
        self.assertEqual(reasons[0], "tidigare möte")
        self.assertIn("+1 + +1 = +2", reasons[1])
        self.assertIsNone(cost_matrix([a, b]).cells[0][1])
        self.assertEqual(pairing_restrictions(a, Player("c", 1800)), ())

    def test_rank_formula_and_half_pairing(self):
        players = [Player(str(i), 2400 - i * 100) for i in range(8)]
        matrix = cost_matrix(players)
        self.assertEqual(matrix.cells[0][4], 0)
        self.assertEqual(float(matrix.cells[0][1]), 3 ** 1.01)
        self.assertEqual(sum(p.cost for p in pair_round(players)), 0)

    def test_matches_exhaustive_optimum(self):
        players = [Player(str(i), 2400 - i * 70, 0, i % 3 - 1)
                   for i in range(6)]
        matrix = cost_matrix(players)

        def costs(indices):
            if not indices:
                yield 0
                return
            first, *rest = indices
            for other in rest:
                if matrix.cells[first][other] is None:
                    continue
                for tail in costs([i for i in rest if i != other]):
                    yield matrix.cells[first][other] + tail

        self.assertAlmostEqual(sum(p.cost for p in pair_round(players)),
                         float(min(costs(list(range(6))))))

    def test_odd_groups_float_lowest_elo_and_sort_without_points(self):
        players = [Player("a", 1900, 3), Player("b", 2100, 2),
                   Player("c", 2000, 2), Player("d", 2200, 1),
                   Player("e", 1800, 1), Player("f", 1700, 1)]
        groups = score_groups(players)
        self.assertEqual([[p.id for p in g] for g in groups],
                         [[], ["b", "c"], ["d", "a", "e", "f"]])
        self.assertEqual([p.points for p in players], [3, 2, 2, 1, 1, 1])
        with patch("swiss._match_group", wraps=__import__("swiss")._match_group) as match:
            self.assertEqual(len(pair_round(players)), 3)
        self.assertEqual([[p.id for p in call.args[0].players]
                          for call in match.call_args_list],
                         [["b", "c"], ["d", "a", "e", "f"]])

    def test_even_groups_are_solved_separately(self):
        players = [Player("a", 2200, 2), Player("b", 2100, 2),
                   Player("c", 2000, 1), Player("d", 1900, 1)]
        games = pair_round(players)
        self.assertEqual([{g.white.id, g.black.id} for g in games],
                         [{"a", "b"}, {"c", "d"}])

    def test_failed_group_repeatedly_takes_two_from_nearest_group(self):
        players = [Player("a", 2100, 3, opponents=frozenset({"b", "c", "d"})),
                   Player("b", 2000, 3), Player("c", 2400, 2),
                   Player("d", 2300, 2), Player("e", 2200, 1),
                   Player("f", 1900, 1), Player("g", 1800, 1),
                   Player("h", 1700, 1)]
        with patch("swiss._match_group", wraps=__import__("swiss")._match_group) as match:
            games = pair_round(players)
        self.assertEqual([[p.id for p in call.args[0].players]
                          for call in match.call_args_list],
                         [["a", "b"], ["c", "d", "a", "b"],
                          ["c", "d", "e", "a", "b", "f"], ["g", "h"]])
        self.assertEqual(len(games), 4)
        self.assertEqual({p.id for g in games for p in (g.white, g.black)},
                         {p.id for p in players})
        expanded = cost_matrix(players[:6])
        self.assertEqual(float(expanded.cells[0][4]), 2 ** 1.01)

    def test_exponent_applies_to_half_distance(self):
        players = [Player("a", 2000, points=2, color_balance=2),
                   Player("b", 1900, points=1, color_balance=-1),
                   Player("c", 1800, points=2)]
        matrix = cost_matrix(players)
        expected = 0.5 ** 1.01 + 0.05
        self.assertEqual(float(matrix.cells[0][1]), expected)
        self.assertEqual(matrix.cells[0][1], matrix.cells[1][0])
        self.assertIsNone(matrix.cells[0][0])

    def test_rematch_and_colors(self):
        players = [Player("a", 2000, color_balance=2, opponents=frozenset({"b"})),
                   Player("b", 1900), Player("c", 1800, color_balance=-2),
                   Player("d", 1700)]
        self.assertIsNone(cost_matrix(players).cells[0][1])
        pairing = pair_round([players[0], players[2]])[0]
        self.assertEqual(pairing.white.id, "c")

    def test_points_do_not_affect_cell_costs(self):
        players = [Player(str(i), 2400 - i * 100, points=i) for i in range(6)]
        same_points = [Player(p.id, p.elo) for p in players]
        self.assertEqual(cost_matrix(players).cells, cost_matrix(same_points).cells)
        self.assertEqual(cost_matrix(players).cells[0][3], 0)

    def test_color_balance_filters_cells_and_adds_small_soft_cost_when_needed(self):
        for balance_sum in range(-3, 4):
            with self.subTest(balance_sum=balance_sum):
                players = [Player("a", 2000, points=1),
                           Player("b", 1900, color_balance=balance_sum)]
                matrix = cost_matrix(players)
                if balance_sum in (-1, 0, 1):
                    self.assertIsNotNone(matrix.cells[0][1])
                    self.assertEqual(len(pair_round(players)), 1)
                    if balance_sum == 0:
                        self.assertEqual(float(matrix.cells[0][1]), 0)
                    else:
                        self.assertEqual(float(matrix.cells[0][1]), 0.05)
                else:
                    self.assertIsNone(matrix.cells[0][1])
                    with self.assertRaises(ValueError):
                        pair_round(players)
                self.assertEqual(matrix.cells[0][1], matrix.cells[1][0])

    def test_color_balance_adds_soft_cost_for_allowed_pairs(self):
        players = [Player("a", 2000, color_balance=1),
                   Player("b", 2000, color_balance=0)]
        matrix = cost_matrix(players)
        self.assertEqual(matrix.cells[0][1], Fraction(1, 20))

    def test_impossible_and_odd(self):
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000)])
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000, opponents=frozenset({"b"})), Player("b", 1900)])
        self.assertEqual(pair_round([]), [])


if __name__ == "__main__":
    unittest.main()
