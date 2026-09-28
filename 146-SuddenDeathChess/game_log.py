"""Standard PGN with white-perspective evaluations and playable alternatives."""
from datetime import datetime
from pathlib import Path
import os
import tempfile
import uuid

import chess
import chess.pgn


def set_evaluation(node, info):
    node.set_eval(info["score"], info.get("depth"))
    # python-chess 1.11.1 omits mate zero when exporting; it can read it.
    if info["score"].is_mate() and info["score"].white().mate() == 0:
        node.comment += " [%eval #0]"


class GameLog:
    def __init__(self, path, human, absolute, relative, initial_seconds=900, increment_seconds=10):
        self.path = Path(path)
        self.game = chess.pgn.Game()
        self.game.headers.update({
            "Event": "Sudden Death Chess", "Site": "Local",
            "Date": datetime.now().strftime("%Y.%m.%d"),
            "White": "Human" if human else "Stockfish",
            "Black": "Stockfish" if human else "Human",
            "TimeControl": f"{initial_seconds:g}+{increment_seconds:g}", "GameId": uuid.uuid4().hex,
            "AbsoluteLimitCP": str(absolute), "RelativeLimitCP": str(relative),
        })
        self.node = self.game

    def move(self, move, clock):
        self.node = self.node.add_main_variation(move)
        self.node.comment = "Analysis pending."
        self.node.set_clock(clock)

    def annotate(self, best_move, best_info, played_info):
        node = self.node
        node.comment = node.comment.replace("Analysis pending.", "").strip()
        set_evaluation(node, played_info)
        if best_move != node.move:
            board = node.parent.board()
            node.comment += f" Best move: {board.san(best_move)}."
            alternative = node.parent.add_variation(best_move, comment="Stockfish best move.")
            set_evaluation(alternative, best_info)

    def finish(self, result, termination, reason):
        self.game.headers["Result"] = result
        self.game.headers["Termination"] = termination
        self.node.comment += " " + reason

    def save(self):
        # Upsert this game so checkpoints never create duplicate games. Replace
        # atomically to leave the previous log intact if writing fails.
        games = []
        if self.path.exists():
            with self.path.open(encoding="utf-8-sig") as handle:
                while (game := chess.pgn.read_game(handle)) is not None:
                    if game.errors:
                        raise ValueError("Befintlig logg.pgn innehåller ogiltig PGN; filen har inte ändrats.")
                    games.append(game)
        for index, game in enumerate(games):
            if game.headers.get("GameId") == self.game.headers["GameId"]:
                games[index] = self.game
                break
        else:
            games.append(self.game)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent,
                                             prefix=".pgn-", suffix=".tmp", delete=False) as handle:
                temporary = handle.name
                for game in games:
                    handle.write(game.accept(chess.pgn.StringExporter(columns=100)) + "\n\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path)
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)
