"""Konvertera en katalog med PGN-filer till W.json och B.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import chess.pgn

def evaluation(node: chess.pgn.GameNode) -> int | None:
    """Centipawns ur vits perspektiv; matt motsvarar +/-1000000 cp."""
    score = node.eval()
    return None if score is None else score.white().score(mate_score=1_000_000)


def load_games(directory: Path) -> dict[str, list[dict]]:
    if not directory.is_dir():
        raise ValueError(f'Ingen katalog: {directory}')
    paths = sorted(p for p in directory.rglob('*') if p.suffix.lower() == '.pgn')
    if not paths:
        raise ValueError(f'Inga PGN-filer hittades i {directory}')
    sides: dict[str, list[dict]] = {'W': [], 'B': []}
    for path in paths:
        missing = 0
        with path.open(encoding='utf-8-sig') as stream:
            while (game := chess.pgn.read_game(stream)) is not None:
                if game.errors:
                    raise ValueError(f'Fel i {path}: {game.errors}')
                board = game.board()
                moves, scores = [], []
                for node in game.mainline():
                    moves.append(board.san(node.move))
                    score = evaluation(node)
                    scores.append('?' if score is None else str(score))
                    missing += score is None
                    board.push(node.move)
                record = {key: game.headers.get(key, '') for key in
                          ('White', 'Black', 'Result', 'Date', 'ChapterURL')}
                record.update(moves=' '.join(moves), evals=' '.join(scores))
                initial = evaluation(game)
                if initial is not None:
                    record['initialEval'] = initial
                name = record['White'].strip()
                side = 'W' if name and name != '?' and name.casefold() in directory.name.casefold() else 'B'
                sides[side].append(record)
        if missing:
            print(f'Varning: {path} saknar eval för {missing} halvdrag.', file=sys.stderr)
    for games in sides.values():
        games.sort(key=lambda game: game['moves'].split())
    return sides


def convert(directory: Path) -> None:
    directory = directory.resolve()
    sides = load_games(directory)
    # Små HTML-vyer delar samma JavaScript och CSS.
    for side, games in sides.items():
        destination = directory / f'{side}.json'
        destination.write_text(json.dumps(games, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (directory / f'{side}.html').write_text(
            '<!doctype html>\n<html lang="sv">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>Schackträd</title>\n<link rel="stylesheet" href="../index.css">\n'
            '</head>\n<body>\n<p id="status" role="status">Läser partier…</p>\n'
            '<div class="table-wrap"><table hidden><thead></thead><tbody></tbody></table></div>\n'
            f'<script src="../index.js" data-source="{side}.json"></script>\n'
            '</body>\n</html>\n', encoding='utf-8')
        print(f'{len(games)} partier sparades i {destination}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path, help='Katalog med PGN-filer, direkt under gemensamma index.js och index.css')
    args = parser.parse_args()
    try:
        convert(args.directory)
    except (OSError, ValueError) as error:
        parser.exit(1, f'Fel: {error}\n')


if __name__ == '__main__':
    main()
