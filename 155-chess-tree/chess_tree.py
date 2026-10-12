"""Läs PGN-partier i minnet och skriv ett alfabetiskt sorterat dragträd."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from decimal import Decimal
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

import chess
import chess.pgn


@dataclass
class Game:
    moves: tuple[str, ...]
    evaluations: tuple[int | None, ...]
    result: str
    initial_evaluation: int | None
    link: str = ''


def evaluation(node: chess.pgn.GameNode) -> int | None:
    """Centibönder ur vits perspektiv; matt motsvarar +/-10000 bönder."""
    score = node.eval()
    return None if score is None else score.white().score(mate_score=1_000_000)


def load_games(directory: Path) -> list[Game]:
    games = []
    paths = sorted(p for p in directory.rglob('*') if p.suffix.lower() == '.pgn')
    if not paths:
        raise ValueError(f'Inga PGN-filer hittades i {directory}')
    for path in paths:
        evaluated_moves = 0
        missing_evaluations = 0
        with path.open(encoding='utf-8-sig') as stream:
            while (pgn := chess.pgn.read_game(stream)) is not None:
                if pgn.errors:
                    raise ValueError(f'Fel i {path}, parti {pgn.headers.get("Event")}: {pgn.errors}')
                board = pgn.board()
                moves, scores = [], []
                for node in pgn.mainline():
                    moves.append(board.san(node.move))
                    scores.append(evaluation(node))
                    board.push(node.move)
                evaluated_moves += sum(score is not None for score in scores)
                missing_evaluations += sum(score is None for score in scores)
                games.append(Game(tuple(moves), tuple(scores),
                                  pgn.headers.get('Result', '*'), evaluation(pgn),
                                  pgn.headers.get('ChapterURL', pgn.headers.get('Site', ''))))
        if evaluated_moves == 0:
            print(f'Varning: {path} saknar eval i huvudvarianterna.', file=sys.stderr)
        elif missing_evaluations:
            print(f'Varning: {path} saknar eval för {missing_evaluations} av '
                  f'{evaluated_moves + missing_evaluations} drag i huvudvarianterna.',
                  file=sys.stderr)
    # Tupler jämförs kolumn för kolumn; en kortare gemensam följd kommer först.
    games.sort(key=lambda game: game.moves)
    return games


def pawns(centipawns: int) -> str:
    value = format(Decimal(abs(centipawns)) / 100, '.2f')
    return value.rstrip('0').rstrip('.')


def truncate(game: Game, max_moves: int = 34) -> tuple[tuple[str, ...], str]:
    previous = game.initial_evaluation
    for index, current in enumerate(game.evaluations[:max_moves]):
        if current is not None:
            if abs(current) > 300:
                return game.moves[:index + 1], f'A{pawns(current)}'
            if previous is not None and abs(current - previous) > 100:
                return game.moves[:index + 1], f'R{pawns(current - previous)}'
        # Saknad eval bryter jämförelsen: jämför bara angränsande positioner.
        previous = current
    if len(game.moves) > max_moves:
        return game.moves[:max_moves], ''
    return game.moves, f'Slut:{game.result}'


def write_tree(games: list[Game], destination: Path, max_moves: int = 34) -> None:
    previous: tuple[str, ...] = ()
    with destination.open('w', encoding='utf-8', newline='\n') as stream:
        stream.write('<!doctype html>\n<html lang="sv">\n<head>\n'
                     '<meta charset="utf-8">\n<title>Schackträd</title>\n'
                     '<style>table { border-collapse: collapse; font-family: monospace; '
                     'line-height: 1.6; } th, td { text-align: left; padding: 3px 8px; '
                     'border: 1px solid #ddd; white-space: nowrap; } '
                     'th { background: #f5f5f5; }</style>\n'
                     '</head>\n<body>\n<table>\n<thead><tr>')
        stream.write(''.join(
            f'<th scope="col">{(column + 1) // 2 if column % 2 else ".."}</th>'
            for column in range(1, max_moves + 1)))
        stream.write('<th class="reason" scope="col">Orsak</th>'
                     '<th scope="col">Länk</th></tr></thead>\n<tbody>\n')
        for game in games:
            moves, reason = truncate(game, max_moves)
            common = 0
            for move, old_move in zip(moves, previous):
                if move != old_move:
                    break
                common += 1
            link = ''
            if urlsplit(game.link).scheme.lower() in ('http', 'https'):
                link = f'<a href="{escape(game.link, quote=True)}">Länk</a>'
            stream.write('<tr>')
            for index in range(max_moves):
                move = moves[index] if common <= index < len(moves) else ''
                stream.write(f'<td>{escape(move)}</td>')
            stream.write(f'<td class="reason">{escape(reason)}</td>'
                         f'<td>{link}</td></tr>\n')
            previous = moves
        stream.write('</tbody>\n</table>\n</body>\n</html>\n')


def main() -> None:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=root / 'data')
    parser.add_argument('--output', type=Path, default=root / 'index.html')
    args = parser.parse_args()
    try:
        games = load_games(args.data)
        write_tree(games, args.output)
    except (OSError, ValueError) as error:
        parser.exit(1, f'Fel: {error}\n')
    print(f'{len(games)} partier inlästa. Trädet sparades i {args.output}')


if __name__ == '__main__':
    main()
