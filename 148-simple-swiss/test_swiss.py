import unittest
from itertools import combinations

from swiss import Player, Weights, cost_matrix, pair_round


class SwissTests(unittest.TestCase):
    def test_rank_formula_and_half_pairing(self):
        players = [Player(str(i), 2400 - i * 100) for i in range(8)]
        matrix = cost_matrix(players)
        self.assertEqual(matrix.cells[0][4], 0)
        self.assertEqual(matrix.cells[0][1], 3)
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
                for tail in costs([i for i in rest if i != other]):
                    yield matrix.cells[first][other] + tail

        self.assertEqual(sum(p.cost for p in pair_round(players, Weights(10, 2, 3))),
                         float(min(costs(list(range(6))))))

    def test_rematch_and_colors(self):
        players = [Player("a", 2000, color_balance=2, opponents=frozenset({"b"})),
                   Player("b", 1900), Player("c", 1800, color_balance=-2),
                   Player("d", 1700)]
        self.assertIsNone(cost_matrix(players).cells[0][1])
        pairing = pair_round([players[0], players[2]])[0]
        self.assertEqual(pairing.white.id, "c")

    def test_impossible_and_odd(self):
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000)])
        with self.assertRaises(ValueError):
            pair_round([Player("a", 2000, opponents=frozenset({"b"})), Player("b", 1900)])
        self.assertEqual(pair_round([]), [])


if __name__ == "__main__":
    unittest.main()
