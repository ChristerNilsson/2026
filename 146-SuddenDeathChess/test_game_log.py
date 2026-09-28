import tempfile
import unittest
from pathlib import Path

import chess
import chess.engine
import chess.pgn

from game_log import GameLog


def info(cp, color=chess.WHITE):
    return {"score": chess.engine.PovScore(chess.engine.Cp(cp), color), "depth": 18}


class GameLogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "logg.pgn"

    def tearDown(self):
        self.temp.cleanup()

    def read_games(self):
        with self.path.open(encoding="utf-8") as handle:
            games = []
            while (game := chess.pgn.read_game(handle)) is not None:
                self.assertFalse(game.errors)
                games.append(game)
            return games

    def test_round_trip_both_colors_variations_and_checkpoints(self):
        log = GameLog(self.path, chess.BLACK, 300, 100)
        log.save()
        log.move(chess.Move.from_uci("e2e4"), 905)
        log.save()
        log.annotate(chess.Move.from_uci("d2d4"), info(30), info(10))
        log.save()
        log.move(chess.Move.from_uci("e7e5"), 902)
        log.annotate(chess.Move.from_uci("c7c5"), info(-20, chess.BLACK), info(-50, chess.BLACK))
        log.finish("1-0", "adjudication", "Relativ gräns.")
        log.save()
        game, = self.read_games()
        self.assertEqual(game.headers["Result"], "1-0")
        self.assertEqual(game.headers["TimeControl"], "900+10")
        self.assertEqual(game.headers["Black"], "Human")
        self.assertEqual(list(game.mainline_moves()), [chess.Move.from_uci(m) for m in ("e2e4", "e7e5")])
        first = game.variations[0]
        second = first.variations[0]
        self.assertEqual(first.eval().white().score(), 10)
        self.assertEqual(second.eval().white().score(), 50)
        self.assertEqual(first.clock(), 905)
        self.assertEqual(second.clock(), 902)
        self.assertEqual(game.variations[1].move.uci(), "d2d4")
        self.assertEqual(first.variations[1].move.uci(), "c7c5")
        self.assertIn("Best move: c5", second.comment)

    def test_new_game_preserves_previous_game_and_pending_move(self):
        first = GameLog(self.path, chess.WHITE, 300, 100)
        first.finish("0-1", "normal", "Resigned.")
        first.save()
        second = GameLog(self.path, chess.WHITE, 300, 100)
        second.move(chess.Move.from_uci("e2e4"), 910)
        second.finish("*", "unterminated", "Window closed during analysis.")
        second.save()
        second.save()
        games = self.read_games()
        self.assertEqual(len(games), 2)
        self.assertEqual(games[0].headers["Result"], "0-1")
        self.assertEqual(games[1].headers["Result"], "*")
        self.assertIn("Analysis pending", games[1].end().comment)

    def test_custom_time_control(self):
        log = GameLog(self.path, chess.WHITE, 300, 100, 210, 2)
        log.save()
        game, = self.read_games()
        self.assertEqual(game.headers["TimeControl"], "210+2")

    def test_checkmate_keeps_mate_not_centipawn_surrogate(self):
        log = GameLog(self.path, chess.WHITE, 300, 100)
        board = chess.Board()
        for uci in ("f2f3", "e7e5", "g2g4", "d8h4"):
            move = chess.Move.from_uci(uci)
            board.push(move)
            log.move(move, 900)
            analysis = ({"score": chess.engine.PovScore(chess.engine.Mate(0), chess.WHITE)}
                        if board.is_checkmate() else info(0))
            log.annotate(move, analysis, analysis)
        log.finish("0-1", "normal", "Checkmate.")
        log.save()
        game, = self.read_games()
        self.assertTrue(game.end().board().is_checkmate())
        self.assertTrue(game.end().eval().is_mate())
        self.assertIn("[%eval #0]", self.path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
