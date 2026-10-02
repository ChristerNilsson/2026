from swiss import Player, Weights, pair_round, cost_matrix

players = [
    Player("Anna", 2100, points=2, color_balance=1),
    Player("Bo", 2000, points=2, color_balance=-1),
    Player("Cia", 1900, points=1),
    Player("Dan", 1800, points=1),
]
weights = Weights(points=100, rank=1, color=1)
matrix = cost_matrix(players, weights)
for game in pair_round(players, weights):
    print(game.white.id, game.black.id, game.cost)
