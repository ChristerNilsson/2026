import unittest
from unittest.mock import Mock

import chess
import chess.engine

from analyze import analyse_position, compact_analysis


class AnalysisTests(unittest.TestCase):
    def test_compact_format_shares_notation_and_keeps_mate(self):
        rows = [dict(uci='e2e4', san='e4', cp=None, mate=2),
                dict(uci='d2d4', san='d4', cp=10, mate=None)]
        packed = compact_analysis(dict(profiles=[dict(id='a'), dict(id='b')], games=[
            dict(headers={}, final_fen='final', positions=[dict(fen='start', played_uci='e2e4',
                 analyses={'a': rows, 'b': list(reversed(rows))})])]))
        p = packed['games'][0]['positions'][0]
        self.assertEqual(p['moves'], [('d2d4', 'd4'), ('e2e4', 'e4')])
        self.assertEqual(p['played'], 1)
        self.assertEqual(p['analyses'], [[[1, '#2'], [0, 10]], [[0, 10], [1, '#2']]])

    def test_all_moves_and_black_perspective(self):
        board = chess.Board()
        board.push_san('e4')
        legal = list(board.legal_moves)
        engine = Mock()
        # White scores ascending: the first move is strongest for Black.
        engine.analyse.return_value = [
            {'pv': [move], 'score': chess.engine.PovScore(chess.engine.Cp(i * 10), chess.WHITE)}
            for i, move in enumerate(legal)
        ]
        rows = analyse_position(engine, board, chess.engine.Limit(nodes=100))
        self.assertEqual(len(rows), len(legal))
        self.assertEqual(rows[0]['uci'], legal[0].uci())
        self.assertEqual(rows[-1]['cp'], -(len(legal)-1)*10)
        self.assertEqual(rows[-1]['loss_cp'], (len(legal)-1)*10)

    def test_missing_multipv_lines_are_completed_and_mate_sorts_first(self):
        board = chess.Board()
        legal = list(board.legal_moves)
        engine = Mock()

        def answer(board, limit, **kwargs):
            if 'multipv' in kwargs:
                return [{'pv': [legal[0]], 'score': chess.engine.PovScore(chess.engine.Mate(2), chess.WHITE)}]
            return {'score': chess.engine.PovScore(chess.engine.Cp(100), chess.WHITE)}

        engine.analyse.side_effect = answer
        rows = analyse_position(engine, board, chess.engine.Limit(nodes=1))
        self.assertEqual(len(rows), 20)
        self.assertEqual(rows[0]['mate'], 2)
        self.assertEqual(rows[0]['loss_cp'], 0)
        self.assertEqual(engine.analyse.call_count, 20)


if __name__ == '__main__':
    unittest.main()
