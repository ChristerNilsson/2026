import copy
import io
import json
import random
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from swiss import PairingError, Player, Swiss, Tournament, pair_next_round, read_players


def event(n=8):
    return {'total_rounds': 5, 'initial_colour': 'white', 'rounds': [],
            'players': [[i, 2200 - i * 50, f'Player {i}']
                        for i in range(1, n + 1)]}


class PairingTests(unittest.TestCase):
    def test_repeat_engine_run(self):
        engine = Swiss(Tournament.from_dict(event()))
        first = engine.pair()
        nodes = engine.nodes
        self.assertEqual(engine.pair(), first)
        self.assertEqual(engine.nodes, nodes)

    def test_random_tournaments(self):
        # Check constraints independently of Player/colour_options, including
        # sparse IDs, changed attendance, scores and colour history after byes.
        checked = 0
        for seed in range(20):
            rng = random.Random(seed)
            n = 54 if seed == 0 else 12
            ids = [100 + 7 * i for i in range(n)]
            data = {'total_rounds': 11 if seed == 0 else 5, 'rounds': [],
                    'initial_colour': rng.choice(['white', 'black']),
                    'players': [[i, rng.randrange(1400, 2200), f'P{i}'] for i in ids],
                    'excluded_players': []}
            colours = {i: [] for i in ids}
            scores = {i: 0 for i in ids}
            seen_pairs, byes = set(), set()
            for r in range(data['total_rounds']):
                excluded = rng.sample(ids, rng.randrange(3))
                data['excluded_players'].append(excluded)
                before = copy.deepcopy(data)
                result = pair_next_round(data)
                self.assertEqual(data, before)
                self.assertEqual(result['round'], r + 1)
                active = set(ids) - set(excluded)
                present, games = [], []
                for w, b in result['pairings']:
                    self.assertNotEqual(w, b)
                    pair = frozenset((w, b))
                    self.assertNotIn(pair, seen_pairs)
                    seen_pairs.add(pair)
                    present.extend((w, b))
                    for pid, c in ((w, 1), (b, -1)):
                        colours[pid].append(c)
                        self.assertLessEqual(abs(sum(colours[pid])), 2)
                        self.assertNotIn(colours[pid][-3:], ([1, 1, 1], [-1, -1, -1]))
                    outcome = rng.randrange(3)
                    scores[w] += outcome
                    scores[b] += 2 - outcome
                    games.append([w, b, outcome])
                if result['bye'] is not None:
                    bye = result['bye']
                    self.assertNotIn(bye, byes)
                    byes.add(bye)
                    present.append(bye)
                    scores[bye] += 2
                    games.append({'bye': bye})
                self.assertEqual(len(present), len(set(present)))
                self.assertEqual(set(present), active)
                self.assertEqual(result['bye'] is not None, bool(len(active) % 2))
                data['rounds'].append(games)
                # Permit loading the final played round solely for this check.
                state = copy.deepcopy(data)
                state['total_rounds'] += 1
                parsed = Tournament.from_dict(state)
                self.assertEqual({p.id: p.score for p in parsed.players}, scores)
                checked += 1
        self.assertEqual(checked, 106)

    def test_failed_cli_reports_old_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, output = Path(tmp) / 'input.json', Path(tmp) / 'old.json'
            source.write_text('{broken', encoding='utf-8')
            output.write_text('{"round": 1}', encoding='utf-8')
            run = subprocess.run([sys.executable, '-X', 'utf8', str(Path('swiss.py').resolve()),
                                  str(source), '-o', str(output)],
                                 capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(run.returncode, 2)
            self.assertIn('gammal lottning', run.stderr)
            self.assertIn('Fel vid läsning', output.with_suffix('.log').read_text(encoding='utf-8'))
            self.assertEqual(output.read_text(), '{"round": 1}')

    def test_exclusions_and_return(self):
        data = event(4)
        data['excluded_players'] = [[1], [2]]
        log = io.StringIO()
        first = pair_next_round(data, log=log)
        playing = {n for pair in first['pairings'] for n in pair}
        self.assertEqual(playing | {first['bye']}, {2, 3, 4})
        self.assertIn('Exkluderade spelare denna rond: 1 (Player 1)', log.getvalue())
        data['rounds'] = [[pair + [1] for pair in first['pairings']] + [{'bye': first['bye']}]]
        tournament = Tournament.from_dict(data)
        absent = next(p for p in tournament.players if p.id == 1)
        self.assertEqual((absent.score, absent.colours, absent.bye), (0, [], False))
        second = pair_next_round(data)
        playing = {n for pair in second['pairings'] for n in pair}
        self.assertEqual(playing | {second['bye']}, {1, 3, 4})

    def test_all_excluded_and_missing_round_list(self):
        data = event(4)
        data['excluded_players'] = [[1, 2, 3, 4]]
        self.assertEqual(pair_next_round(data), {'round': 1, 'pairings': [], 'bye': None})
        data['rounds'] = [[]]
        result = pair_next_round(data)
        self.assertEqual({n for pair in result['pairings'] for n in pair}, {1, 2, 3, 4})
        self.assertIsNone(result['bye'])

    def test_invalid_exclusions_and_history(self):
        for excluded in ([1], [[99]], [[True]], [[1, 1]], [None], [[]] * 6):
            data = event(4)
            data['excluded_players'] = excluded
            with self.subTest(excluded=excluded), self.assertRaises(PairingError):
                Tournament.from_dict(data)
        data = event(4)
        data['excluded_players'] = [[1]]
        data['rounds'] = [[[1, 2, 1], [3, 4, 1]]]
        with self.assertRaises(PairingError):
            Tournament.from_dict(data)

    def test_first_round_split_and_colours(self):
        result = pair_next_round(event())
        self.assertEqual(result['pairings'], [[1, 5], [6, 2], [3, 7], [8, 4]])
        self.assertIsNone(result['bye'])

    def test_initial_black(self):
        data = event(4)
        data['initial_colour'] = 'black'
        first = pair_next_round(data)['pairings'][0]
        self.assertEqual(first, [3, 1])

    def test_first_round_colours_after_exclusion(self):
        data = event(6)
        data['initial_colour'] = 'black'
        data['excluded_players'] = [[2, 6]]
        # Active order is 1,3,4,5. Player 3 is now second and gets white.
        self.assertEqual(pair_next_round(data)['pairings'], [[4, 1], [3, 5]])

    def test_carlsten_lundberg_colours(self):
        data = event(54)
        data['players'] = [[i, 2400 - i, f'Player {i}'] for i in range(1, 55)]
        data['initial_colour'] = 'black'
        data['excluded_players'] = [[13, 26, 27, 30, 43, 50]]
        result = pair_next_round(data)
        self.assertIn([41, 14], result['pairings'])
        self.assertNotIn([14, 41], result['pairings'])
        self.assertEqual(len(result['pairings']), 24)

    def test_backtracking_escapes_dead_end(self):
        # First choice 1-3 strands 2 and 4, who have already met.
        players = [Player(i, str(i), 2000, i) for i in range(1, 5)]
        players[1].opponents.add(4)
        players[3].opponents.add(2)
        log = io.StringIO()
        engine = Swiss(Tournament(players, [], 5, 1), log=log)
        result = engine.pair()
        pairs = [set(g) for g in result['pairings']]
        self.assertEqual(pairs, [{1, 2}, {3, 4}])
        self.assertGreater(engine.nodes, 3)
        self.assertIn('har redan mötts', log.getvalue())
        self.assertIn('Backa från', log.getvalue())
        self.assertIn('Slutlig lottning', log.getvalue())

    def test_logging_does_not_change_pairing_and_records_errors(self):
        log = io.StringIO()
        self.assertEqual(pair_next_round(event(9), log=log), pair_next_round(event(9)))
        self.assertIn('Prova frirond', log.getvalue())
        with self.assertRaises(PairingError):
            pair_next_round(event(), max_nodes=1, log=log)
        self.assertIn('Fel: Sökgränsen', log.getvalue())

    def test_cli_log_file_and_path_collision(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'input.json'
            output = Path(tmp) / 'next.json'
            source.write_text(json.dumps(event()), encoding='utf-8')
            command = [sys.executable, '-X', 'utf8', str(Path('swiss.py').resolve()),
                       str(source), '-o', str(output)]
            run = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertIn('Slutlig lottning', output.with_suffix('.log').read_text(encoding='utf-8'))
            self.assertEqual(json.loads(output.read_text()), pair_next_round(event()))
            self.assertEqual(run.stdout.strip(), '[[1,5],[6,2],[3,7],[8,4]]')
            self.assertEqual(output.with_suffix('.log').read_text(encoding='utf-8').splitlines()[-1],
                             run.stdout.strip())
            before = source.read_bytes()
            run = subprocess.run(command + ['--log', str(source)], capture_output=True)
            self.assertEqual(run.returncode, 2)
            self.assertEqual(source.read_bytes(), before)

    def test_colour_limits(self):
        a = Player(1, 'A', 2000, 1, colours=[1, 1])
        b = Player(2, 'B', 1900, 2, colours=[1, 1])
        self.assertEqual(Swiss(Tournament([a, b], [], 5, 1)).colour_options(1, 2), [])
        b.colours = [-1, -1]
        self.assertEqual(Swiss(Tournament([a, b], [], 5, 1)).colour_options(1, 2)[0][1], (2, 1))

    def test_several_rounds_and_byes(self):
        data = event(9)
        byes, played = set(), set()
        for _ in range(5):
            result = pair_next_round(data)
            seen, games = set(), []
            for w, b in result['pairings']:
                pair = frozenset((w, b))
                self.assertNotIn(pair, played)
                self.assertFalse({w, b} & seen)
                seen.update((w, b))
                played.add(pair)
                games.append([w, b, 1])
            bye = result['bye']
            self.assertNotIn(bye, byes)
            self.assertNotIn(bye, seen)
            byes.add(bye)
            seen.add(bye)
            self.assertEqual(len(seen), 9)
            games.append({'bye': bye})
            data['rounds'].append(games)

    def test_example_deterministic_and_unchanged(self):
        data = event(6)
        data['rounds'] = [[[1, 4, 2], [5, 2, 1], [3, 6, 0]]]
        before = copy.deepcopy(data)
        self.assertEqual(pair_next_round(data), pair_next_round(data))
        self.assertEqual(data, before)

    def test_read_players(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'players.txt'
            path.write_text('\ufeffLeif Lundquist\t 1856\n\nWFM Susanna Berg  1917\nOlle Ålgars 1949\n',
                            encoding='utf-8')
            self.assertEqual(read_players(path), [[1, 1856, 'Leif Lundquist'],
                                                 [2, 1917, 'WFM Susanna Berg'],
                                                 [3, 1949, 'Olle Ålgars']])
            for content in ('', 'Anna 2100\nBo unknown', 'Anna 2100\nBo 10000'):
                path.write_text(content, encoding='utf-8')
                with self.assertRaises(PairingError):
                    read_players(path)

    def test_validation(self):
        for change in (
            lambda d: d.update(total_rounds=True),
            lambda d: d['players'][0].__setitem__(1, -1),
            lambda d: d['players'][0].__setitem__(0, 2),
            lambda d: d.update(rounds=[[]]),
            lambda d: d['players'][0].append(1),
        ):
            with self.subTest(change=change):
                data = event()
                change(data)
                with self.assertRaises(PairingError):
                    pair_next_round(data)

    def test_impossible_and_search_limit(self):
        data = event(2)
        data['rounds'] = [[[1, 2, 2]]]
        with self.assertRaisesRegex(PairingError, 'Ingen lottning'):
            pair_next_round(data)
        with self.assertRaisesRegex(PairingError, 'Sökgränsen'):
            pair_next_round(event(), max_nodes=1)

    def test_ids_are_independent_of_rating_order(self):
        data = event(2)
        data['players'] = [[30, 1800, 'A'], [10, 2100, 'B']]
        data['rounds'] = [[[30, 10, 0]]]
        players = Tournament.from_dict(data).players
        self.assertEqual([(p.id, p.number, p.score) for p in players],
                         [(10, 1, 2), (30, 2, 0)])
        self.assertEqual(players[0].colours, [-1])
        self.assertEqual(players[1].colours, [1])
        data['rounds'] = []
        self.assertEqual(pair_next_round(data),
                         {'round': 1, 'pairings': [[10, 30]], 'bye': None})

    def test_result_codes(self):
        for result in (0, 1, 2):
            with self.subTest(result=result):
                data = event(2)
                data['rounds'] = [[[1, 2, result]]]
                players = Tournament.from_dict(data).players
                self.assertEqual([p.score for p in players], [result, 2 - result])

    def test_invalid_compact_records(self):
        for player in ([True, 2100, 'A'], [0, 2100, 'A'], ['1', 2100, 'A'],
                       [1, True, 'A'], [1, 2100, ''], [1, 2100]):
            with self.subTest(player=player):
                data = event(2)
                data['players'][0] = player
                with self.assertRaises(PairingError):
                    Tournament.from_dict(data)
        for game in ([1, 2], [1, 2, 3], [1, 2, True], [1, 2, 1.0],
                     [1, 2, '1-0'], [1, 99, 2], [True, 2, 0], [1, 1, 2],
                     {'bye': True}):
            with self.subTest(game=game):
                data = event(2)
                data['rounds'] = [[game]]
                with self.assertRaises(PairingError):
                    Tournament.from_dict(data)


if __name__ == '__main__':
    unittest.main()
