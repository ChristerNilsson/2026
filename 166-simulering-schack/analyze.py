"""Analyse PGN main lines with a local UCI engine; no engine runs in the browser."""
import argparse
import json
import os
from pathlib import Path

import chess
import chess.engine
import chess.pgn


def positive(value):
    number = float(value)
    if not 0 < number < float('inf'):
        raise argparse.ArgumentTypeError('Värdet måste vara positivt och ändligt.')
    return number


def analyse_position(engine, board, limit):
    legal = list(board.legal_moves)
    infos = engine.analyse(board, limit, multipv=len(legal))
    by_move = {info['pv'][0]: info for info in infos if info.get('pv') and 'score' in info}
    # Very small budgets can finish before every MultiPV line is available.
    for move in legal:
        if move not in by_move:
            info = engine.analyse(board, limit, root_moves=[move])
            if 'score' not in info:
                raise RuntimeError(f'Motorn gav ingen värdering för {move}. Öka budgeten.')
            by_move[move] = info
    rows = []
    for move in legal:
        info = by_move[move]
        score = info['score'].pov(board.turn)
        rows.append(dict(uci=move.uci(), san=board.san(move),
                         cp=score.score(), mate=score.mate(),
                         sort_score=score.score(mate_score=100000),
                         depth=info.get('depth', 0)))
    rows.sort(key=lambda row: (-row['sort_score'], row['uci']))
    for row in rows:
        row['loss_cp'] = rows[0]['sort_score'] - row['sort_score']
    return rows


def compact_analysis(result):
    """Keep notation once per position; each profile stores move index + score."""
    games = []
    for game in result['games']:
        positions = []
        for position in game['positions']:
            first = position['analyses'][result['profiles'][0]['id']]
            moves = sorted((row['uci'], row['san']) for row in first)
            indices = {move[0]: i for i, move in enumerate(moves)}
            analyses = [[[indices[row['uci']], f'#{row["mate"]}' if row['mate'] is not None else row['cp']]
                         for row in position['analyses'][profile['id']]] for profile in result['profiles']]
            positions.append(dict(fen=position['fen'], played=indices[position['played_uci']], moves=moves, analyses=analyses))
        games.append(dict(headers=game['headers'], positions=positions, final_fen=game['final_fen']))
    return dict(schema_version=2, profiles=result['profiles'], engine=result.get('engine', {}), games=games)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pgn', type=Path)
    parser.add_argument('-o', '--output', type=Path, default=Path('analysis.json'))
    parser.add_argument('--engine', default=os.environ.get('STOCKFISH_EXECUTABLE', 'stockfish'))
    budget = parser.add_mutually_exclusive_group(required=True)
    budget.add_argument('--nodes', type=int, help='Nodbudget per position')
    budget.add_argument('--seconds', type=positive, help='Tidsbudget per position i sekunder')
    args = parser.parse_args()
    if args.nodes is not None and args.nodes <= 0:
        parser.error('--nodes måste vara positiva heltal')
    profiles = ([dict(id=f'nodes-{args.nodes}', kind='nodes', value=args.nodes, label=f'{args.nodes:,} noder')]
                if args.nodes is not None else
                [dict(id=f'time-{args.seconds}', kind='time', value=args.seconds, label=f'{args.seconds:g} sekunder')])
    result = dict(schema_version=1, score_perspective='side_to_move', profiles=profiles, games=[])
    with chess.engine.SimpleEngine.popen_uci(args.engine) as engine:
        result['engine'] = engine.id
        with args.pgn.open(encoding='utf-8-sig') as source:
            while (game := chess.pgn.read_game(source)) is not None:
                if game.errors:
                    raise ValueError(f'Ogiltig PGN: {game.errors}')
                board = game.board()
                if not board.is_valid() or board.chess960:
                    raise ValueError('Endast giltiga positioner i standardschack stöds.')
                entry = dict(headers=dict(game.headers), positions=[])
                for ply, move in enumerate(game.mainline_moves()):
                    position = dict(ply=ply, fen=board.fen(), turn='white' if board.turn else 'black',
                                    played_uci=move.uci(), played_san=board.san(move), analyses={})
                    for profile in profiles:
                        print(f'Parti {len(result["games"])+1}, halvdrag {ply+1}, {profile["label"]}', flush=True)
                        engine.configure({'Clear Hash': None}) if 'Clear Hash' in engine.options else None
                        position['analyses'][profile['id']] = analyse_position(
                            engine, board, chess.engine.Limit(**{profile['kind']: profile['value']}))
                    board.push(move)
                    position['after_fen'] = board.fen()
                    entry['positions'].append(position)
                entry['final_fen'] = board.fen()
                result['games'].append(entry)
    if not result['games'] or not any(g['positions'] for g in result['games']):
        raise ValueError('PGN-filen innehåller inga drag.')
    temporary = args.output.with_suffix(args.output.suffix + '.tmp')
    temporary.write_text(json.dumps(compact_analysis(result), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temporary.replace(args.output)
    print(f'Sparat {args.output}')


if __name__ == '__main__':
    main()
