"""Viktad Swiss-lottning med NetworkX Blossom."""

from dataclasses import dataclass
from fractions import Fraction
from math import isfinite
from typing import Sequence

import networkx as nx


@dataclass(frozen=True)
class Player:
    id: str
    elo: int
    points: float = 0
    color_balance: int = 0  # Antal vita minus antal svarta partier.
    opponents: frozenset[str] = frozenset()


@dataclass(frozen=True)
class Weights:
    points: float = 100
    rank: float = 1
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


def cost_matrix(players: Sequence[Player], weights: Weights = Weights()) -> CostMatrix:
    """None anger diagonal eller förbjudet åter möte; övriga celler är kostnader."""
    players = tuple(players)
    if len({p.id for p in players}) != len(players):
        raise ValueError("Spelar-id måste vara unika.")
    if any(not isfinite(p.points) or p.points < 0 for p in players):
        raise ValueError("Poängen måste vara ändliga och icke-negativa.")
    groups = {}
    for p in players:
        groups.setdefault(p.points, []).append(p)
    for group in groups.values():
        group.sort(key=lambda p: (-p.elo, p.id))
    wp, wr, wc = (Fraction(str(v)) for v in
                  (weights.points, weights.rank, weights.color))
    cells = [[None] * len(players) for _ in players]
    for a, p in enumerate(players):
        for b in range(a + 1, len(players)):
            q = players[b]
            if q.id in p.opponents or p.id in q.opponents:
                continue
            group = groups[p.points]
            if p.points != q.points:
                group = sorted(group + groups[q.points], key=lambda x: (-x.elo, x.id))
            ranks = {x.id: i for i, x in enumerate(group)}
            rank_cost = abs(abs(ranks[p.id] - ranks[q.id]) - Fraction(len(group), 2))
            cost = (wp * abs(Fraction(str(p.points)) - Fraction(str(q.points)))
                    + wr * rank_cost + wc * abs(p.color_balance + q.color_balance))
            cells[a][b] = cells[b][a] = cost
    return CostMatrix(players, tuple(tuple(row) for row in cells))


def pair_round(players: Sequence[Player], weights: Weights = Weights()) -> list[Pairing]:
    """Minimera summan av parkostnader; kräv att alla spelare blir parade.

    Vid udda deltagarantal måste en frirond väljas av anroparen först.
    Indata och spelarhistorik ändras aldrig.
    """
    if len(players) % 2:
        raise ValueError("Välj en spelare för frirond före lottning av udda antal.")
    matrix = cost_matrix(players, weights)
    graph = nx.Graph()
    graph.add_nodes_from(range(len(matrix.players)))
    # Exakta rationella kostnader skalas till heltal för Blossom.
    from math import lcm
    scale = lcm(*(c.denominator for row in matrix.cells for c in row if c is not None))
    for i, row in enumerate(matrix.cells):
        for j in range(i + 1, len(row)):
            if row[j] is not None:
                graph.add_edge(i, j, weight=int(row[j] * scale))
    matching = nx.min_weight_matching(graph, weight="weight")
    if len(matching) * 2 != len(matrix.players):
        raise ValueError("Ingen fullständig lottning finns utan åter möten.")
    result = []
    for i, j in sorted(tuple(sorted(edge)) for edge in matching):
        p, q = matrix.players[i], matrix.players[j]
        p_white = abs(p.color_balance + 1) + abs(q.color_balance - 1)
        q_white = abs(p.color_balance - 1) + abs(q.color_balance + 1)
        white, black = (p, q) if p_white <= q_white else (q, p)
        result.append(Pairing(white, black, float(matrix.cells[i][j])))
    return result


if __name__ == "__main__":
    players = [Player(str(i + 1), 2400 - i * 100) for i in range(8)]
    for pairing in pair_round(players):
        print(f"Vit: {pairing.white.id}, svart: {pairing.black.id}, kostnad: {pairing.cost:g}")
