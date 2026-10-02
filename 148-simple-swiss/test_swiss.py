import unittest
from itertools import combinations

from swiss import Player, Weights, cost_matrix, pair_round


class SwissTests(unittest.TestCase):
    def test_rank_formula_and_half_pairing(self):
        players = [Player(str(i), 2400 - i * 100) for i in range(8)]
        matrix = cost_matrix(players)
        self.assertEqual(matrix.cells[0][4], 0)
        self.assertEqual(float(matrix.cells[0][1]), 300 ** 1.01)
        self.assertEqual(sum(p.cost for p in pair_round(players)), 0)

    def test_matches_exhaustive_optimum(self):
        players = [Player(str(i), 2400 - i * 70, i // 2, i % 3 - 1)
                   for i in range(6)]
        matrix = cost_matrix(players, Weights(10, 2, 3))

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

        self.assertAlmostEqual(sum(p.cost for p in pair_round(players, Weights(10, 2, 3))),
                         float(min(costs(list(range(6))))))

    def test_exponent_applies_to_total_pair_cost(self):
        players = [Player("a", 2000, points=2, color_balance=2),
                   Player("b", 1900, points=1, color_balance=-1),
                   Player("c", 1800, points=2)]
        matrix = cost_matrix(players)
        expected = (10000 + 100 * 0.5) ** 1.01
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

    def test_component_differences_do_not_cancel(self):
        players = [Player("a", 2000, points=1, color_balance=-2),
                   Player("b", 1900, points=2, color_balance=1),
                   Player("c", 1800, points=1)]
        matrix = cost_matrix(players, Weights(10, 2, 3))
        # Skillnaderna är -1 och -0.5; absolutvärden tas före viktning.
        self.assertEqual(float(matrix.cells[0][1]), (10 + 1) ** 1.01)
        opposite = [Player("a", 2000, color_balance=-2),
                    Player("b", 1900, color_balance=2)]
        self.assertEqual(cost_matrix(opposite, Weights(0, 0, 3)).cells[0][1], 0)

    def test_color_balance_filters_cells_without_adding_cost(self):
        for balance_sum in range(-3, 4):
            with self.subTest(balance_sum=balance_sum):
                players = [Player("a", 2000, points=1),
                           Player("b", 1900, color_balance=balance_sum)]
                matrix = cost_matrix(players, Weights(10, 2, 999))
                if balance_sum in (-1, 0, 1):
                    self.assertEqual(float(matrix.cells[0][1]), 10 ** 1.01)
                    self.assertEqual(len(pair_round(players)), 1)
                else:
                    self.assertIsNone(matrix.cells[0][1])
                    with self.assertRaises(ValueError):
                        pair_round(players)
                self.assertEqual(matrix.cells[0][1], matrix.cells[1][0])

    def test_impossible_and_odd(self):
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000)])
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000, opponents=frozenset({"b"})), Player("b", 1900)])
        self.assertEqual(pair_round([]), [])


if __name__ == "__main__":
    unittest.main()
