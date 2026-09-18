"""Readable Swiss pairing in pure Python.

Scores are stored in half-points. This is a simplified Swiss heuristic,
not an exact implementation of JaVaFo or the FIDE Dutch rules.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path


class PairingError(ValueError):
    pass


def read_players(path):
    """Read one name + rating per line; assign IDs in file order."""
    players = []
    for line_number, line in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        parts = line.rsplit(maxsplit=1)
        if len(parts) != 2 or not parts[1].isascii() or not parts[1].isdigit():
            raise PairingError(f'{path}, rad {line_number}: förväntade namn följt av Elo.')
        name, rating = parts
        if not 0 <= int(rating) <= 9999:
            raise PairingError(f'{path}, rad {line_number}: Elo måste vara 0–9999.')
        players.append([len(players) + 1, int(rating), name.strip()])
    if not 2 <= len(players) <= 9999:
        raise PairingError(f'{path}: förväntade 2–9999 spelare.')
    return players


@dataclass
class Player:
    id: int
    name: str
    elo: int
    number: int
    score: int = 0
    colours: list[int] = field(default_factory=list)
    opponents: set[int] = field(default_factory=set)
    bye: bool = False

    @property
    def difference(self):
        return sum(self.colours)

    @property
    def preference(self):
        """(colour: white=1 / black=-1, strength: 0..3)."""
        d = self.difference
        if not self.colours:
            return 0, 0
        if abs(d) > 1:
            return (-1 if d > 0 else 1), 3
        if len(self.colours) >= 2 and self.colours[-1] == self.colours[-2]:
            return -self.colours[-1], 3
        if d:
            return -d, 2
        return -self.colours[-1], 1


@dataclass
class Tournament:
    players: list[Player]
    rounds: list
    total_rounds: int
    initial_colour: int
    excluded_players: list[list[int]] = field(default_factory=list)

    def excluded_in_round(self, round_number):
        if round_number <= len(self.excluded_players):
            return set(self.excluded_players[round_number - 1])
        return set()

    @classmethod
    def from_dict(cls, data):
        def require(ok, message):
            if not ok:
                raise PairingError(message)

        require(isinstance(data, dict), 'Indata ska vara ett JSON-objekt.')
        require(set(data) <= {'players', 'rounds', 'total_rounds', 'initial_colour', 'excluded_players'},
                'Okänt fält i turneringen.')
        raw = data.get('players')
        require(isinstance(raw, list) and 2 <= len(raw) <= 9999,
                'players ska innehålla 2–9999 spelare.')
        total = data.get('total_rounds')
        require(type(total) is int and 1 <= total <= 99,
                'total_rounds ska vara ett heltal 1–99.')
        colour = data.get('initial_colour', 'white')
        require(colour in ('white', 'black'), 'initial_colour ska vara white eller black.')
        players = []
        ids = set()
        for i, p in enumerate(raw):
            require(isinstance(p, list) and len(p) == 3,
                    'Varje spelare anges som [id, elo, namn].')
            pid, elo, name = p
            require(type(pid) is int and pid > 0 and pid not in ids,
                    'Spelar-id måste vara unika positiva heltal.')
            ids.add(pid)
            require(isinstance(name, str) and bool(name.strip()), 'Spelaren behöver ett namn.')
            require(type(elo) is int and 0 <= elo <= 9999, 'elo ska vara ett heltal 0–9999.')
            players.append(Player(pid, name, elo, i + 1))
        # Stable input order resolves equal ratings; retain throughout event.
        # Public player IDs are independent of these internal ranking numbers.
        players.sort(key=lambda p: -p.elo)
        for i, p in enumerate(players, 1):
            p.number = i
        rounds = data.get('rounds', [])
        require(isinstance(rounds, list) and len(rounds) < total,
                'rounds ska vara en lista med färre ronder än total_rounds.')
        by_id = {p.id: p for p in players}
        excluded = data.get('excluded_players', [])
        require(isinstance(excluded, list) and len(excluded) <= total,
                'excluded_players ska vara en lista per rond, högst total_rounds listor.')
        for r, absent in enumerate(excluded, 1):
            require(isinstance(absent, list) and all(type(n) is int and n in ids for n in absent),
                    f'Exkluderade spelare i rond {r} måste vara kända spelar-id.')
            require(len(absent) == len(set(absent)), f'Upprepat exkluderat spelar-id i rond {r}.')
        tournament = cls(players, rounds, total, 1 if colour == 'white' else -1, excluded)
        for r, games in enumerate(rounds, 1):
            active = ids - tournament.excluded_in_round(r)
            require(isinstance(games, list), f'Rond {r} ska vara en lista med partier.')
            seen = set()
            updates = []
            byes = 0
            for game in games:
                if isinstance(game, dict):
                    require(set(game) == {'bye'}, 'Frirond anges som {"bye": id}.')
                    pid = game['bye']
                    require(type(pid) is int and pid in active and pid not in seen,
                            f'Ogiltig eller upprepad spelare i rond {r}.')
                    p = by_id[pid]
                    require(not p.bye, f'{p.name} har redan fått frirond.')
                    seen.add(pid)
                    byes += 1
                    updates.append((p, None, 2, 0))
                    continue
                require(isinstance(game, list) and len(game) == 3,
                        'Partier anges som [vit, svart, resultat].')
                a, b, result = game
                require(type(a) is int and type(b) is int and
                        a in active and b in active and a != b and
                        a not in seen and b not in seen, f'Ogiltiga spelare i rond {r}.')
                require(type(result) is int and result in (0, 1, 2),
                        'Resultat för vit ska vara 0 (förlust), 1 (remi) eller 2 (vinst).')
                p, q = by_id[a], by_id[b]
                require(q.number not in p.opponents, f'{a} och {b} har redan mötts.')
                seen.update((a, b))
                updates.extend(((p, q, result, 1), (q, p, 2 - result, -1)))
            require(seen == active and byes == len(active) % 2,
                    f'Alla deltagande spelare måste förekomma exakt en gång i rond {r}; '
                    'en frirond krävs vid udda deltagarantal.')
            for p, q, points, c in updates:
                p.score += points
                if q is None:
                    p.bye = True
                else:
                    p.colours.append(c)
                    p.opponents.add(q.number)
        return tournament


class Swiss:
    """Readable Swiss heuristic: ordered choices + recursive backtracking.

    This is not a full implementation of the FIDE Dutch system. It returns the
    first complete pairing in its search order, not a global optimum.
    """

    def __init__(self, tournament: Tournament, max_nodes: int = 200_000, log=None):
        if type(max_nodes) is not int or max_nodes < 1:
            raise PairingError('max_nodes måste vara ett positivt heltal.')
        self.t = tournament
        self.players = {p.number: p for p in tournament.players}
        excluded = tournament.excluded_in_round(len(tournament.rounds) + 1)
        active = sorted(n for n, p in self.players.items() if p.id not in excluded)
        # First-round colour alternation follows the participating players,
        # without changing the permanent IDs or ranking numbers.
        self.initial_positions = {n: i for i, n in enumerate(active, 1)}
        self.max_nodes = max_nodes
        self.nodes = 0
        self.log = log
        self.search = lru_cache(None)(self.search)

    def trace(self, message):
        if self.log is not None:
            print(message, file=self.log, flush=True)

    def label(self, n):
        p = self.players[n]
        return f'{p.id} ({p.name})'

    def colour_options(self, a, b):
        """Return legal (white, black) choices, best colour balance first."""
        p, q = self.players[a], self.players[b]
        if b in p.opponents:
            self.trace(f'  Avvisa {self.label(a)} mot {self.label(b)}: har redan mötts.')
            return []
        choices = []
        for white, black in ((p, q), (q, p)):
            cost = 0
            for player, colour in ((white, 1), (black, -1)):
                preferred, strength = player.preference
                # Hard limits: no third consecutive colour and balance <= 2.
                if abs(player.difference + colour) > 2:
                    self.trace(f'  Avvisa färgval vit {white.id}, svart {black.id}: '
                               f'{player.id} skulle få färgbalans {player.difference + colour:+d}.')
                    break
                if player.colours[-2:] == [colour, colour]:
                    self.trace(f'  Avvisa färgval vit {white.id}, svart {black.id}: '
                               f'{player.id} skulle få tre lika färger i rad.')
                    break
                if preferred and preferred != colour:
                    cost += strength
            else:
                # Tie: higher-ranked player's preference, then initial colour.
                higher = min((p, q), key=lambda x: (-x.score, x.number))
                colour_number = (self.initial_positions[higher.number]
                                 if not self.t.rounds else higher.number)
                wanted = higher.preference[0] or (
                    self.t.initial_colour if colour_number % 2 else -self.t.initial_colour)
                assigned = 1 if higher is white else -1
                choices.append(((cost, assigned != wanted), (white.number, black.number)))
        return sorted(choices)

    def search(self, remaining):
        """Pair the leader, recursively pair the rest; undo a dead-end choice."""
        self.nodes += 1
        if self.nodes > self.max_nodes:
            raise PairingError('Sökgränsen nåddes. Höj --max-nodes för större sökning.')
        if not remaining:
            self.trace('Alla spelare har fått motståndare.')
            return ()
        self.trace(f'Söktillstånd {self.nodes}: kvar '
                   f'{[self.players[n].id for n in remaining]}.')
        a = remaining[0]
        leader = self.players[a]
        same_score = [n for n in remaining if self.players[n].score == leader.score]
        # Dutch-inspired split: 1-5, 2-6, 3-7, 4-8 in an eight-player group.
        target = max(1, len(same_score) // 2)
        candidates = []
        for position, b in enumerate(remaining[1:], 1):
            options = self.colour_options(a, b)
            if not options:
                continue
            colour_cost, pair = options[0]
            priority = (abs(leader.score - self.players[b].score),
                        colour_cost[0], abs(position - target), position)
            candidates.append((priority, b, pair))
        for priority, b, pair in sorted(candidates):
            self.trace(f'Prova vit {self.label(pair[0])}, svart {self.label(pair[1])}: '
                       f'poängskillnad {priority[0] / 2:g}, färgkostnad {priority[1]}, '
                       f'avstånd från gruppdelning {priority[2]}.')
            rest = tuple(n for n in remaining if n != a and n != b)
            hits = self.search.cache_info().hits
            tail = self.search(rest)
            if self.search.cache_info().hits > hits:
                self.trace('  Sparade sökresultat återanvändes i denna gren.')
            if tail is not None:
                self.trace(f'Behåll vit {self.players[pair[0]].id}, svart {self.players[pair[1]].id}.')
                return (pair,) + tail
            self.trace(f'Backa från {self.label(a)} mot {self.label(b)}: resten kan inte lottas.')
        self.trace(f'Återvändsgränd: ingen motståndare för {self.label(a)} ger en komplett lottning.')
        return None

    def pair(self):
        self.nodes = 0
        self.search.cache_clear()
        excluded = self.t.excluded_in_round(len(self.t.rounds) + 1)
        remaining = tuple(sorted((n for n, p in self.players.items() if p.id not in excluded),
                                 key=lambda n: (-self.players[n].score, n)))
        self.trace(f'Lottar rond {len(self.t.rounds) + 1} av {self.t.total_rounds}. '
                   f'Sökgräns: {self.max_nodes}.')
        excluded_names = ', '.join(self.label(p.number) for p in
                                   sorted(self.players.values(), key=lambda p: p.id)
                                   if p.id in excluded) or 'inga'
        self.trace(f'Exkluderade spelare denna rond: {excluded_names}. '
                   f'Antal deltagande: {len(remaining)}.')
        if not self.t.rounds:
            self.trace('Startfärger växlar efter ordningen bland deltagande spelare, '
                       'efter att exkluderade tagits bort. Spelar-id behålls.')
        self.trace('Prioritet: poängskillnad, färgkostnad, gruppdelning, listordning. '
                   'Lägre värden prövas först.')
        for n in remaining:
            p = self.players[n]
            colours = ''.join('V' if c == 1 else 'S' for c in p.colours) or '-'
            self.trace(f'Spelare {self.label(n)}: {p.score / 2:g} poäng, Elo {p.elo}, '
                       f'färger {colours}, tidigare frirond: {"ja" if p.bye else "nej"}.')
        # Lowest score, then lowest initial rank; never a second bye.
        bye_choices = [None] if len(remaining) % 2 == 0 else [
            n for n in reversed(remaining) if not self.players[n].bye]
        # A failed remainder is independent of how earlier pairs were chosen.
        for bye in bye_choices:
            if bye is not None:
                self.trace(f'Prova frirond för {self.label(bye)}.')
            pairs = self.search(tuple(n for n in remaining if n != bye))
            if pairs is not None:
                self.trace(f'Klar efter {self.nodes} söktillstånd. Slutlig lottning:')
                for w, b in pairs:
                    self.trace(f'  Vit {self.label(w)} – svart {self.label(b)}')
                self.trace(f'Frirond: {self.label(bye) if bye is not None else "ingen"}.')
                return self.output(pairs, bye)
            if bye is not None:
                self.trace(f'Backa från frirond för {self.label(bye)}.')
        raise PairingError('Ingen lottning uppfyller kraven: inga återkommande möten, '
                           'högst två lika färger i rad, färgbalans högst två och '
                           'högst en frirond per spelare.')

    def output(self, pairs, bye):
        return {'round': len(self.t.rounds) + 1,
                'pairings': [[self.players[w].id, self.players[b].id] for w, b in pairs],
                'bye': self.players[bye].id if bye is not None else None}


def pair_next_round(data, *, max_nodes=200_000, log=None):
    """Optionally write a readable search trace to an open text file."""
    try:
        return Swiss(Tournament.from_dict(data), max_nodes, log).pair()
    except (PairingError, RecursionError) as e:
        if isinstance(e, RecursionError):
            e = PairingError('Pythons rekursionsgräns nåddes. Ingen lottning skapades.')
        if log is not None:
            print(f'Fel: {e}', file=log, flush=True)
        raise e


def main():
    parser = argparse.ArgumentParser(description='Lotta nästa rond med en lättläst Swiss-motor i Python.')
    parser.add_argument('input', type=Path)
    parser.add_argument('-o', '--output', type=Path)
    parser.add_argument('--players', type=Path, help='Läs spelare från en textfil med namn och Elo.')
    parser.add_argument('--max-nodes', type=int, default=200_000)
    parser.add_argument('--log', type=Path, help='Loggfil (standard: utdata eller indata med ändelsen .log).')
    args = parser.parse_args()
    output_validated = False
    try:
        inputs = {args.input.resolve()}
        if args.players:
            inputs.add(args.players.resolve())
        if args.output and args.output.resolve() in inputs:
            raise PairingError('Utdata får inte skriva över indata.')
        log_path = args.log or (args.output or args.input).with_suffix('.log')
        if log_path.resolve() in inputs | {args.output.resolve() if args.output else None}:
            raise PairingError('Loggfilen måste vara skild från indata och utdata.')
        output_validated = True
        with log_path.open('w', encoding='utf-8') as log:
            print(f'Indata: {args.input.resolve()}', file=log, flush=True)
            print(f'Utdata: {args.output.resolve() if args.output else "standardutmatning"}',
                  file=log, flush=True)
            try:
                data = json.loads(args.input.read_text(encoding='utf-8-sig'))
                if args.players:
                    if not isinstance(data, dict):
                        raise PairingError('Indata ska vara ett JSON-objekt.')
                    if 'players' in data:
                        raise PairingError('Ange spelare antingen i JSON eller med --players, inte båda.')
                    data['players'] = read_players(args.players)
                    print(f'Spelare: {args.players} ({len(data["players"])} spelare, id i filordning).',
                          file=log, flush=True)
            except (OSError, UnicodeError, json.JSONDecodeError, PairingError) as e:
                print(f'Fel vid läsning av indata: {e}', file=log, flush=True)
                raise
            result = pair_next_round(data, max_nodes=args.max_nodes, log=log)
            games = list(result['pairings'])
            if result['bye'] is not None:
                games.append({'bye': result['bye']})
            round_line = json.dumps(games, separators=(',', ':'))
            print('Lottning att kopiera:', file=log)
            print(round_line, file=log)
        text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.output:
            args.output.write_text(text, encoding='utf-8')
            print(f'Lottning sparad i {args.output.resolve()}. Logg: {log_path.resolve()}', file=sys.stderr)
        # Copyable round list. Results are added by the user after play.
        print(round_line)
    except (PairingError, OSError, UnicodeError, json.JSONDecodeError) as e:
        print(f'Fel: {e}', file=sys.stderr)
        if output_validated and args.output and args.output.exists():
            print(f'Ingen ny lottning kunde sparas. {args.output.resolve()} kan innehålla '
                  'en gammal lottning och ska inte användas för denna körning.', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
