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
        self.app = App(self.root, settings_path=None)
        self.app.abs_limit = 300
        self.app.rel_limit = 100

    def tearDown(self):
        self.app.close()

    def lose(self, black=False, hearts=1):
        self.app.hearts = hearts
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

    def test_final_answer_and_best_guess_for_both_colors(self):
        for black in (False, True):
            with self.subTest(black=black):
                before, best = self.lose(black)
                self.assertFalse(self.app.active)
                self.assertEqual(self.app.board.fen(), before.fen())
                self.assertIn(before.san(best), self.app.review_text.get())
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
        self.assertIn("förbättring med 160 centipawn", self.app.review_text.get())
        self.assertNotIn(before.san(best), self.app.review_text.get())
        self.assertEqual(self.app.board.fen(), before.fen())
        self.app.reveal_answer()
        self.assertIn("180 centipawn", self.app.review_text.get())

    def test_new_game_clears_exercise(self):
        self.lose()
        self.app.submit = Mock()
        self.app.start()
        self.assertIsNone(self.app.review)
        self.assertEqual(self.app.review_text.get(), "")
        self.assertEqual(self.app.board.fen(), chess.Board().fen())
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
        self.assertEqual(self.app.history.set("1", "white_eval"), "+25")
        self.assertEqual(self.app.history.set("1", "black"), "e5")
        self.assertEqual(self.app.history.set("1", "black_best"), "")
        board.push(black_move)
        self.app.update_history(board, chess.Move.from_uci("g1f3"))
        self.assertEqual(self.app.history.get_children(), ("1", "2"))

    def test_table_shows_answer_immediately(self):
        before, best = self.lose()
        self.assertEqual(self.app.history.set("1", "white_best"), before.san(best))
        self.assertEqual(self.app.history.set("1", "white_best_eval"), "+30")
        self.app.reveal_answer()
        self.assertEqual(self.app.history.set("1", "white_best"), before.san(best))
        self.assertEqual(self.app.history.set("1", "white_best_eval"), "+30")

    def test_three_hearts_allow_two_retries(self):
        for remaining in (3, 2, 1):
            before, best = self.lose(hearts=remaining)
            self.assertEqual(self.app.hearts, remaining - 1)
            self.assertEqual(self.app.absolute_mistakes, 0)
            self.assertEqual(self.app.board.fen(), before.fen())
            self.assertEqual(self.app.active, remaining > 1)
            self.assertIn(before.san(best), self.app.review_text.get())
            if remaining > 1:
                self.assertIsNone(self.app.review)

    def test_absolute_threshold_scales_only_with_absolute_mistakes(self):
        board = chess.Board()
        move = chess.Move.from_uci("e2e4")
        for hearts, score in ((3, -301), (2, -601), (1, -901)):
            self.app.hearts = hearts
            self.app.human = chess.WHITE
            self.app.active = True
            self.app.board = board.copy()
            self.app.board.push(move)
            info = {"score": chess.engine.PovScore(chess.engine.Cp(score), chess.WHITE)}
            self.app.evaluated((board.copy(), move, move, (score, score), info, info))
            self.assertEqual(self.app.hearts, hearts - 1)
            self.assertEqual(self.app.absolute_mistakes, 4 - hearts)

    def test_engine_time_setting_is_locked_and_passed_with_clocks(self):
        for value, expected in (("2", 2), ("0.001", 0.001)):
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
                self.assertIsNone(limit.white_clock)
                self.assertIsNone(limit.black_clock)
                self.assertEqual(limit.depth, 18 if expected is None else None)

    @patch("main.messagebox.showerror")
    def test_invalid_engine_time_does_not_start_game(self, showerror):
        self.app.submit = Mock()
        for value in ("0", "-1", "NaN", "inf", "abc", "0.0001", "", "6"):
            self.app.max_time.set(value)
            self.app.start()
        self.assertEqual(showerror.call_count, 8)
        self.app.submit.assert_not_called()

    def test_selectable_hearts(self):
        self.assertEqual(self.app.starting_hearts.get(), "5")
        for count in range(1, 8):
            self.app.starting_hearts.set(str(count))
            self.app.submit = Mock()
            self.app.start()
            self.assertEqual(self.app.hearts, count)
            self.assertEqual(self.app.total_hearts, count)
            self.assertEqual(self.app.heart_text.get().count("♥"), count)


if __name__ == "__main__":
    unittest.main()
