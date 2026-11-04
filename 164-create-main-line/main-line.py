"""Skapa en huvudlinje från startställningen med Stockfish."""

from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation

import chess
import chess.engine


def million_nodes(value: str) -> int:
    try:
        nodes = Decimal(value) * 1_000_000
        if not nodes.is_finite() or nodes < 1:
            raise ValueError
        return int(nodes)
    except (InvalidOperation, ValueError, OverflowError):
        raise argparse.ArgumentTypeError('Ange ett positivt antal miljoner noder (minst 0.000001).') from None


def format_score(score: chess.engine.PovScore) -> str:
    white = score.white()
    if white.is_mate():
        return f'#{white.mate():+d}'
    return f'{white.score() / 100:+.2f}'


def create_line(engine: chess.engine.SimpleEngine, nodes: int) -> None:
    engine.configure({'Threads': 1, 'Skill Level': 20, 'UCI_LimitStrength': False})
    engine.configure({'Clear Hash': None})
    board = chess.Board()
    print('Värderingar ur vits perspektiv, i bönder. # anger matt.')
    print('Avsluta med Ctrl+C eller slut på indata.')
    while not board.is_game_over(claim_draw=True):
        if len(board.move_stack) % 20 == 0:
            input('Tryck Enter för nästa 10 heldrag: ')
        # Nodbudgeten delas mellan samtliga lagliga drag med MultiPV.
        lines = engine.analyse(
            board, chess.engine.Limit(nodes=nodes),
            multipv=board.legal_moves.count(),
        )
        candidates = [line for line in lines if line.get('pv') and 'score' in line]
        if not candidates:
            raise ValueError('Stockfish returnerade inga drag med värdering.')
        best_score = max(line['score'].pov(board.turn) for line in candidates)
        best = [line for line in candidates if line['score'].pov(board.turn) == best_score]
        prefix = f'{board.fullmove_number}.' if board.turn == chess.WHITE else f'{board.fullmove_number}...'
        line = best[0]
        move = board.san(line['pv'][0])
        print(f'{prefix} {move}  {format_score(line["score"])}')
        board.push(line['pv'][0])
    outcome = board.outcome(claim_draw=True)
    print(f'Slut: {outcome.result()} ({outcome.termination.name})')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('nodes', type=million_nodes,
                        help='Miljoner söknoder per halvdrag, t.ex. 1 eller 0.5')
    parser.add_argument('--stockfish', default=r'\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe',
                        help=r'Sökväg till Stockfish (standard: \Program Files\stockfish\stockfish-windows-x86-64-avx2.exe)')
    args = parser.parse_args()
    try:
        with chess.engine.SimpleEngine.popen_uci(args.stockfish) as engine:
            create_line(engine, args.nodes)
    except (KeyboardInterrupt, EOFError):
        print('\nAvslutat.')
    except (OSError, ValueError, chess.engine.EngineError) as error:
        parser.exit(1, f'Fel: {error}\n')


if __name__ == '__main__':
    main()
