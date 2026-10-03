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


@dataclass(frozen=True)
class Pairing:
    white: Player
    black: Player
    cost: float


@dataclass(frozen=True)
class CostMatrix:
    players: tuple[Player, ...]
    cells: tuple[tuple[Fraction | None, ...], ...]


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


def cost_matrix(players: Sequence[Player]) -> CostMatrix:
    """Rankavvikelse i en Elo-sorterad grupp med liten färgbonus.

    None anger diagonal, åter möte eller otillåten summerad färgbalans.
    """
    players = tuple(players)
    if len({p.id for p in players}) != len(players):
        raise ValueError("Spelar-id måste vara unika.")
    if any(not isfinite(p.points) or p.points < 0 for p in players):
        raise ValueError("Poängen måste vara ändliga och icke-negativa.")
    group = sorted(players, key=lambda p: (-p.elo, p.id))
    ranks = {p.id: i for i, p in enumerate(group)}
    cells = [[None] * len(players) for _ in players]
    for a, p in enumerate(players):
        for b in range(a + 1, len(players)):
            q = players[b]
            if pairing_restrictions(p, q):
                continue
            distance = abs(abs(ranks[p.id] - ranks[q.id]) - Fraction(len(group), 2))
            # En liten mjuk färgkostnad förbättrar färgbalansen utan att göra
            # färgen till en hård barriär mellan tillåtna par.
            cells[a][b] = cells[b][a] = (
                Fraction(float(distance) ** 1.01) + COLOR_COST_WEIGHT * color_cost(p, q)
            )
    return CostMatrix(players, tuple(tuple(row) for row in cells))


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
        group.sort(key=lambda p: (-p.elo, p.id))
        if len(group) % 2:
            groups[index + 1].append(group.pop())
    return groups


def pair_round(
    players: Sequence[Player],
    *,
    on_group: Callable[[int, tuple[Player, ...], list[Pairing] | None], None] | None = None,
) -> list[Pairing]:
    """Lös jämna poänggrupper uppifrån; utöka med två spelare vid behov.

    Hämtade spelare har högst Elo i närmaste kvarvarande lägre grupp.
    Avslutade grupper omprövas inte. Indata och historik ändras aldrig.
    on_group får varje försöks gruppnummer, spelare och resultat (None vid misslyckande).
    """
    groups = score_groups(players)
    result = []
    for index, group in enumerate(groups):
        if not group:
            continue
        while True:
            group.sort(key=lambda p: (-p.elo, p.id))
            matrix = cost_matrix(group)
            pairings = _match_group(matrix)
            if on_group is not None:
                on_group(index + 1, matrix.players, pairings)
            if pairings is not None:
                result.extend(pairings)
                break
            donor = next((g for g in groups[index + 1:] if g), None)
            if donor is None:
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
        p_white = abs(p.color_balance + 1) + abs(q.color_balance - 1)
        q_white = abs(p.color_balance - 1) + abs(q.color_balance + 1)
        white, black = (p, q) if p_white <= q_white else (q, p)
        result.append(Pairing(white, black, float(matrix.cells[i][j])))
    return result

