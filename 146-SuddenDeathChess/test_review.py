"""Exercise the post-loss UI without requiring an installed chess engine."""
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import chess
import chess.engine

from main import App, create_window


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.root = create_window()
        self.root.withdraw()
        self.app = App(self.root)
        self.app.abs_limit = 300
        self.app.rel_limit = 100

    def tearDown(self):
        self.app.close()

    def lose(self, black=False):
        before = chess.Board()
        if black:
            before.push_uci("e2e4")
        self.app.human = before.turn
        bad = chess.Move.from_uci("f7f6" if black else "f2f3")
        best = chess.Move.from_uci("e7e5" if black else "e2e4")
        self.app.board = before.copy()
        self.app.board.push(bad)
        self.app.active = True
        self.app.evaluated((before, bad, best, (30, -150),
                            {"score": chess.engine.PovScore(chess.engine.Cp(30), before.turn)},
                            {"score": chess.engine.PovScore(chess.engine.Cp(-150), before.turn)}))
        return before, best

    def click_move(self, move):
        for square in (move.from_square, move.to_square):
            col = chess.square_file(square)
            row = 7 - chess.square_rank(square)
            if not self.app.human:
                col, row = 7 - col, 7 - row
            self.app.click(SimpleNamespace(x=col * 70 + 35, y=row * 70 + 35))

    def test_hidden_answer_and_best_guess_for_both_colors(self):
        for black in (False, True):
            with self.subTest(black=black):
                before, best = self.lose(black)
                self.assertFalse(self.app.active)
                self.assertEqual(self.app.board.fen(), before.fen())
                self.assertNotIn(before.san(best), self.app.review_text.get())
                self.assertTrue(all(c.started is None for c in self.app.clocks.values()))
                self.click_move(best)
                self.assertIn("Rätt!", self.app.review_text.get())
                self.assertIn(before.san(best), self.app.review_text.get())
                self.assertEqual(self.app.board.fen(), before.fen())
                self.assertFalse(self.app.active)

    def test_alternative_feedback_does_not_reveal_answer(self):
        before, best = self.lose()
        engine = Mock()
        engine.analyse.return_value = {"score": chess.engine.PovScore(chess.engine.Cp(10), chess.WHITE)}
        self.app.engine = engine
        self.app.submit = lambda job, callback: callback(job())
        self.click_move(chess.Move.from_uci("d2d4"))
        self.assertIn("förbättring med 160 cp", self.app.review_text.get())
        self.assertNotIn(before.san(best), self.app.review_text.get())
        self.assertEqual(self.app.board.fen(), before.fen())
        self.app.reveal_answer()
        self.assertIn("180 cp", self.app.review_text.get())

    def test_new_game_clears_exercise(self):
        self.lose()
        self.app.submit = Mock()
        self.app.start()
        self.assertIsNone(self.app.review)
        self.assertEqual(self.app.review_text.get(), "")
        self.assertEqual(self.app.board.fen(), chess.Board().fen())
        self.assertEqual(str(self.app.reveal_button["state"]), "disabled")
        self.assertEqual(self.app.history.get_children(), ())

    def test_move_table_groups_colors_and_preserves_white_cells(self):
        self.app.human = chess.BLACK
        board = chess.Board()
        played = {"score": chess.engine.PovScore(chess.engine.Cp(25), chess.WHITE)}
        best = {"score": chess.engine.PovScore(chess.engine.Cp(40), chess.WHITE)}
        white_move = chess.Move.from_uci("e2e4")
        self.app.update_history(board, white_move)
        self.assertEqual(self.app.history.set("1", "white"), "e4")
        self.app.update_history(board, white_move, chess.Move.from_uci("d2d4"), best, played)
        board.push(white_move)
        black_move = chess.Move.from_uci("e7e5")
        self.app.update_history(board, black_move, black_move, played, played)
        self.assertEqual(self.app.history.get_children(), ("1",))
        self.assertEqual(self.app.history.set("1", "white_best"), "d4")
        self.assertEqual(self.app.history.set("1", "white_eval"), "-25 cp")
        self.assertEqual(self.app.history.set("1", "black"), "e5")
        self.assertEqual(self.app.history.set("1", "black_best"), "")
        board.push(black_move)
        self.app.update_history(board, chess.Move.from_uci("g1f3"))
        self.assertEqual(self.app.history.get_children(), ("1", "2"))

    def test_table_hides_review_answer_until_revealed(self):
        before, best = self.lose()
        self.assertEqual(self.app.history.set("1", "white_best"), "Dolt")
        self.assertEqual(self.app.history.set("1", "white_best_eval"), "Dolt")
        self.app.reveal_answer()
        self.assertEqual(self.app.history.set("1", "white_best"), before.san(best))
        self.assertEqual(self.app.history.set("1", "white_best_eval"), "+30 cp")

    def test_custom_game_time_is_locked_and_used_by_both_clocks_and_engine(self):
        self.app.minutes.set("3,5")
        self.app.increment.set("2")
        self.app.submit = Mock()
        self.app.start()
        self.app.minutes.set("15")
        self.app.increment.set("10")
        for clock in self.app.clocks.values():
            self.assertEqual(clock.value(), 210)
            clock.stop(increment=True)
            self.assertEqual(clock.value(), 212)
        self.app.human = chess.BLACK
        self.app.engine = Mock()
        self.app.next_turn()
        self.app.submit.call_args.args[0]()
        limit = self.app.engine.play.call_args.args[1]
        self.assertEqual(limit.white_inc, 2)
        self.assertEqual(limit.black_inc, 2)

    def test_engine_time_setting_is_locked_and_passed_with_clocks(self):
        for value, expected in (("2,5", 2.5), ("  ", None)):
            with self.subTest(value=value):
                self.app.max_time.set(value)
                self.app.submit = Mock()
                self.app.start()
                self.app.max_time.set("99")
                self.app.human = chess.BLACK
                self.app.engine = Mock()
                self.app.next_turn()
                job = self.app.submit.call_args.args[0]
                job()
                limit = self.app.engine.play.call_args.args[1]
                self.assertEqual(limit.time, expected)
                self.assertEqual(limit.white_inc, 10)
                self.assertEqual(limit.black_inc, 10)
                self.assertGreater(limit.white_clock, 899)
                self.assertEqual(limit.black_clock, 900)

    @patch("main.messagebox.showerror")
    def test_invalid_engine_time_does_not_start_game(self, showerror):
        self.app.submit = Mock()
        for value in ("0", "-1", "NaN", "inf", "abc", "0.0001"):
            self.app.max_time.set(value)
            self.app.start()
        self.assertEqual(showerror.call_count, 6)
        self.app.submit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
