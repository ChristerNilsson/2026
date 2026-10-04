"""Gruppvis Swiss-lottning med NetworkX Blossom."""

from dataclasses import dataclass
from fractions import Fraction
from math import isfinite
from typing import Callable, Sequence

import networkx as nx

COLOR_COST_WEIGHT = Fraction(1, 20)


@dataclass(frozen=True)
class Player:
    id: str
    elo: int
    points: float = 0
    color_balance: int = 0  # Antal vita minus antal svarta partier.
    opponents: frozenset[str] = frozenset()
    upfloat_count: int = 0
    downfloat_count: int = 0
    float_history: tuple[str, ...] = ()  # Rond 1 på index 0: up/down/none.
    color_history: tuple[str, ...] = ()  # Spelade partier, äldsta först.
    pairing_number: int | None = None
    initial_color: str = "white"

    def __post_init__(self):
        if self.upfloat_count < 0 or self.downfloat_count < 0:
            raise ValueError("Antalet upfloats/downfloats får inte vara negativa.")


@dataclass(frozen=True)
class Weights:
    """Vikter enbart för spelaröversiktens individuella statistik."""
    points: float = 10000
    rank: float = 100
    color: float = 1

    def __post_init__(self):
        if any(not isfinite(v) or v < 0 for v in
               (self.points, self.rank, self.color)):
            raise ValueError("Vikterna måste vara ändliga och icke-negativa.")


def pairing_order(player: Player):
    """Fast lottningsnummer; Elo används för spelare utan lottningsnummer."""
    return (player.pairing_number if player.pairing_number is not None else float("inf"),
            -player.elo, player.id)


@dataclass(frozen=True)
class Pairing:
    white: Player
    black: Player
    cost: float


@dataclass(frozen=True)
class CostMatrix:
    players: tuple[Player, ...]
    cells: tuple[tuple[Fraction | None, ...], ...]
    components: tuple = ()  # Färgönskemål, starka önskemål, rankavstånd, färgbalans.


def pairing_restrictions(p: Player, q: Player) -> tuple[str, ...]:
    """Ange samtliga regler som förbjuder ett spelarpar."""
    reasons = []
    if q.id in p.opponents or p.id in q.opponents:
        reasons.append("tidigare möte")
    if p.color_balance + q.color_balance not in (-1, 0, 1):
        reasons.append(
            f"färgbalans ({p.color_balance:+d} + {q.color_balance:+d} = "
            f"{p.color_balance + q.color_balance:+d}; tillåtet: -1, 0 eller +1)"
        )
    return tuple(reasons)


def color_cost(p: Player, q: Player) -> int:
    """Liten mjuk kostnad för avvikande total färgbalans i paret."""
    return abs(p.color_balance + q.color_balance)


def unmet_color_preferences(p: Player, q: Player) -> tuple[int, int]:
    """Antal ouppfyllda färgönskemål, totalt respektive starka."""
    white, black = allocate_colors(p, q)
    unmet = strong = 0
    for player, assigned in ((white, "white"), (black, "black")):
        preferred, strength = color_preference(player)
        if preferred is not None and preferred != assigned:
            unmet += 1
            strong += strength == 2
    return unmet, strong


def color_preference(player: Player) -> tuple[str | None, int]:
    """Önskad färg och styrka: absolut=3, stark=2, mild=1 (1.7)."""
    balance, history = player.color_balance, player.color_history
    if abs(balance) > 1:
        return ("black" if balance > 0 else "white"), 3
    if len(history) >= 2 and history[-1] == history[-2]:
        return ("black" if history[-1] == "white" else "white"), 3
    if balance:
        return ("black" if balance > 0 else "white"), 2
    if history:
        return ("black" if history[-1] == "white" else "white"), 1
    return None, 0


def allocate_colors(p: Player, q: Player) -> tuple[Player, Player]:
    """FIDE Dutch 2026-02-01, färgtilldelning i ordningen 5.2.1–5.2.5."""
    pc, ps = color_preference(p)
    qc, qs = color_preference(q)

    def grant(player, color):
        other = q if player is p else p
        return (player, other) if color == "white" else (other, player)

    if pc != qc:
        if pc is not None:
            return grant(p, pc)
        if qc is not None:
            return grant(q, qc)
    if ps != qs:
        return grant(p, pc) if ps > qs else grant(q, qc)
    if ps == 3 and abs(p.color_balance) != abs(q.color_balance):
        return grant(p, pc) if abs(p.color_balance) > abs(q.color_balance) else grant(q, qc)
    for previous_p, previous_q in zip(reversed(p.color_history), reversed(q.color_history)):
        if previous_p != previous_q:
            return grant(p, "black" if previous_p == "white" else "white")
    higher = min((p, q), key=lambda player: (
        -player.points, player.pairing_number if player.pairing_number is not None else float("inf"),
        -player.elo, player.id))
    preference, _ = color_preference(higher)
    if preference is not None:
        return grant(higher, preference)
    color = higher.initial_color
    if higher.pairing_number is not None and higher.pairing_number % 2 == 0:
        color = "black" if color == "white" else "white"
    return grant(higher, color)


def cost_matrix(players: Sequence[Player], *, s1_ids: frozenset[str] | None = None) -> CostMatrix:
    """Färgönskemål före rankavvikelse i en Elo-sorterad grupp.

    S1 är normalt övre Elo-halvan och S2 den undre. Endast S1–S2 tillåts.
    None anger samma delgrupp, åter möte eller otillåten färgbalans.
    """
    players = tuple(players)
    if len({p.id for p in players}) != len(players):
        raise ValueError("Spelar-id måste vara unika.")
    if any(not isfinite(p.points) or p.points < 0 for p in players):
        raise ValueError("Poängen måste vara ändliga och icke-negativa.")
    group = sorted(players, key=pairing_order)
    ranks = {p.id: i for i, p in enumerate(group)}
    # En enhet måste överstiga hela matchningens lägre prioriterade kostnad.
    pair_count = len(group) // 2
    strong_unit = pair_count * (Fraction(len(group) ** 1.01) + COLOR_COST_WEIGHT) + 1
    preference_unit = (2 * pair_count + 1) * strong_unit
    if s1_ids is None:
        s1_ids = frozenset(p.id for p in group[:len(group) // 2])
    if not s1_ids <= ranks.keys():
        raise ValueError("S1 måste innehålla spelare från gruppen.")
    cells = [[None] * len(players) for _ in players]
    components = [[None] * len(players) for _ in players]
    for a, p in enumerate(players):
        for b in range(a + 1, len(players)):
            q = players[b]
            if (p.id in s1_ids) == (q.id in s1_ids):
                continue
            if pairing_restrictions(p, q):
                continue
            distance = abs(abs(ranks[p.id] - ranks[q.id]) - Fraction(len(group), 2))
            unmet, strong = unmet_color_preferences(p, q)
            parts = (
                unmet * preference_unit, strong * strong_unit,
                Fraction(float(distance) ** 1.01), COLOR_COST_WEIGHT * color_cost(p, q),
            )
            components[a][b] = components[b][a] = parts
            cells[a][b] = cells[b][a] = sum(parts)
    return CostMatrix(players, tuple(tuple(row) for row in cells),
                      tuple(tuple(row) for row in components))


def score_groups(players: Sequence[Player]) -> list[list[Player]]:
    """Jämna ut poänggrupper uppifrån med lägsta Elo som nedflyttare."""
    if len(players) % 2:
        raise ValueError("Välj en spelare för frirond före lottning av udda antal.")
    if len({p.id for p in players}) != len(players):
        raise ValueError("Spelar-id måste vara unika.")
    if any(not isfinite(p.points) or p.points < 0 for p in players):
        raise ValueError("Poängen måste vara ändliga och icke-negativa.")
    by_points = {}
    for player in players:
        by_points.setdefault(player.points, []).append(player)
    groups = [by_points[points] for points in sorted(by_points, reverse=True)]
    for index, group in enumerate(groups):
        group.sort(key=pairing_order)
        if len(group) % 2:
            downfloater = min(group, key=lambda p: (p.elo,
                             -(p.pairing_number if p.pairing_number is not None else 0),
                             p.id))
            group.remove(downfloater)
            groups[index + 1].append(downfloater)
    return groups


def pair_round(
    players: Sequence[Player],
    *,
    on_group: Callable[[float, tuple[Player, ...], list[Pairing] | None], None] | None = None,
    on_matrix: Callable[[float, CostMatrix], None] | None = None,
) -> list[Pairing]:
    """Lös jämna poänggrupper uppifrån; utöka med två spelare vid behov.

    Hämtade spelare har högst Elo i närmaste kvarvarande lägre grupp.
    Avslutade grupper omprövas inte. Indata och historik ändras aldrig.
    on_group får varje försöks grupppoäng, spelare och resultat (None vid misslyckande).
    """
    groups = score_groups(players)
    downfloaters = {
        p.id for group in groups if group
        for p in group if p.points > min(q.points for q in group)
    }
    result = []
    completed = []
    for index, group in enumerate(groups):
        if not group:
            continue
        group_points = min(player.points for player in group)
        while True:
            group.sort(key=pairing_order)
            matrix = cost_matrix(group)
            # Lås nedflyttaren till första tillåtna motståndaren i Elo-ordning.
            pairings = None
            for i, player in enumerate(matrix.players):
                if player.id not in downfloaters:
                    continue
                candidates = [j for j, candidate in enumerate(matrix.players)
                              if candidate.points < player.points
                              and not pairing_restrictions(player, candidate)]
                # C17 (2026-02-01) är ett kvalitetskriterium, inte ett förbud.
                # Stabil sortering behåller fallande Elo inom båda kategorierna.
                candidates.sort(key=lambda j: (
                    len(matrix.players[j].float_history) >= 2
                    and matrix.players[j].float_history[-2] == "up"))
                for opponent in candidates:
                    # MDP-paret väljs först. Återstoden delas i Elo-halvor.
                    remainder = [p for j, p in enumerate(matrix.players)
                                 if j not in (i, opponent)]
                    s1_ids = frozenset([player.id] + [
                        p.id for p in remainder[:len(remainder) // 2]])
                    trial = cost_matrix(group, s1_ids=s1_ids)
                    cells = [list(row) for row in trial.cells]
                    for j in range(len(group)):
                        if j != opponent:
                            cells[i][j] = cells[j][i] = None
                    trial = CostMatrix(matrix.players, tuple(tuple(row) for row in cells),
                                       trial.components)
                    pairings = _match_group(trial)
                    matrix = trial
                    if pairings is not None:
                        break
                break  # Jämnandet ger högst en nedflyttare per grupp.
            else:
                pairings = _match_group(matrix)
            if on_group is not None:
                on_group(group_points, matrix.players, pairings)
            if on_matrix is not None:
                on_matrix(group_points, matrix)
            if pairings is not None:
                result.extend(pairings)
                completed.append((group_points, tuple(group), pairings))
                break
            donor = next((g for g in groups[index + 1:] if g), None)
            if donor is None:
                # Om sista gruppen låser sig, ompröva tidigare grupper för att
                # kunna fullfölja lottningen med samma frirondskandidat.
                remainder = list(group)
                while completed:
                    previous_points, previous_players, previous_games = completed.pop()
                    del result[-len(previous_games):]
                    previous_players = sorted(previous_players, key=pairing_order)
                    for moved_count in range(2, len(previous_players) + 1, 2):
                        moved = sorted(previous_players, key=lambda p: (p.elo, pairing_order(p)))[:moved_count]
                        moved_ids = {p.id for p in moved}
                        upper = [p for p in previous_players if p.id not in moved_ids]
                        lower = sorted(moved + remainder, key=pairing_order)
                        upper_matrix = cost_matrix(upper)
                        upper_games = _match_group(upper_matrix)
                        if upper_games is None:
                            continue
                        lower_matrix = cost_matrix(lower)
                        lower_games = _match_group(lower_matrix)
                        if lower_games is not None:
                            for points, retry, pairs in (
                                (previous_points, upper_matrix, upper_games),
                                (group_points, lower_matrix, lower_games),
                            ):
                                if retry.players:
                                    if on_group is not None:
                                        on_group(points, retry.players, pairs)
                                    if on_matrix is not None:
                                        on_matrix(points, retry)
                            result.extend(upper_games + lower_games)
                            return sorted(result, key=lambda game: -(game.white.points + game.black.points))
                    remainder.extend(previous_players)
                raise ValueError("Ingen fullständig lottning finns med tillåtna motståndare och färgbalanser.")
            group.extend(donor[:2])
            del donor[:2]
    return sorted(result, key=lambda game: -(game.white.points + game.black.points))


def _match_group(matrix: CostMatrix) -> list[Pairing] | None:
    """Blossom optimerar den aktuella gruppen och kräver full matchning."""
    graph = nx.Graph()
    graph.add_nodes_from(range(len(matrix.players)))
    # Scale powered costs to integers without additional rounding.
    from math import lcm
    scale = lcm(*(c.denominator for row in matrix.cells for c in row if c is not None))
    for i, row in enumerate(matrix.cells):
        for j in range(i + 1, len(row)):
            if row[j] is not None:
                graph.add_edge(i, j, weight=int(row[j] * scale))
    matching = nx.min_weight_matching(graph, weight="weight")
    if len(matching) * 2 != len(matrix.players):
        return None
    result = []
    for i, j in sorted(tuple(sorted(edge)) for edge in matching):
        p, q = matrix.players[i], matrix.players[j]
        white, black = allocate_colors(p, q)
        result.append(Pairing(white, black, float(matrix.cells[i][j])))
    return result

