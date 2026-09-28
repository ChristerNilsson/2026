import unittest
from unittest.mock import patch

import chess
import chess.engine

from rules import Clock, loss_reason


class RulesTests(unittest.TestCase):
    def test_absolute_boundary_is_strict(self):
        self.assertIsNone(loss_reason(-300, -300, 300, 100))
        self.assertIn("Absolut", loss_reason(-301, -301, 300, 100))

    def test_relative_boundary_is_strict(self):
        self.assertIsNone(loss_reason(80, -20, 300, 100))
        self.assertIn("Relativ", loss_reason(80, -21, 300, 100))

    def test_improvement_does_not_lose(self):
        self.assertIsNone(loss_reason(0, 50, 300, 100))

    def test_black_perspective(self):
        score = chess.engine.PovScore(chess.engine.Cp(350), chess.WHITE)
        self.assertIn("Absolut", loss_reason(-350, score.pov(chess.BLACK).score(), 300, 100))

    @patch("rules.time.monotonic")
    def test_clock_increment_and_paused_analysis(self, now):
        now.return_value = 100
        clock = Clock()
        clock.start()
        now.return_value = 115
        clock.stop(increment=True)
        self.assertEqual(clock.value(), 895)
        now.return_value = 150
        self.assertEqual(clock.value(), 895)

    @patch("rules.time.monotonic")
    def test_increment_cannot_rescue_timeout(self, now):
        now.return_value = 0
        clock = Clock(remaining=1)
        clock.start()
        now.return_value = 2
        clock.stop(increment=True)
        self.assertEqual(clock.value(), 0)


if __name__ == "__main__":
    unittest.main()
