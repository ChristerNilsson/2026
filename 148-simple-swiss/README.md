# Simple Swiss

Python 3.10+ och Blossom via NetworkX.

```powershell
python -m pip install -r requirements.txt
python swiss.py
python -m unittest -v
```

```python
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
```

Varje tillåten cell innehåller parkostnaden

`w_points * abs(points_i - points_j) + w_rank * abs(abs(i-j) - n/2) + w_color * abs(balance_i + balance_j)`.

`i` och `j` är positioner i fallande Elo-ordning inom poänggruppen;
lika Elo avgörs med spelar-id. `n` är gruppens storlek. För olika poänggrupper
används deras förenade Elo-sorterade grupp som en uttrycklig utvidgning av formeln.
Färgbalans är antal vita minus antal svarta partier. Absolutbeloppet gör
att färgkostnaden mäter obalans utan att gynna negativa summor.

Matrisen är symmetrisk och följer indatas spelarordning. `None` betyder
diagonal eller förbjudet åter möte. Historik i endera spelarens `opponents`
räcker för att förbjuda paret. Blossom minimerar hela omgångens totalkostnad.
Kostnader beräknas rationellt och skalas till heltal inför optimeringen.
Färg väljs därefter genom att minimera summan av spelarnas absoluta
färgbalanser efter partiet; vid lika utfall får den först angivna spelaren vitt.

Vikterna ger mjuka prioriteringar: 100 garanterar inte att poängskillnad alltid
går före alla andra kriterier i en stor turnering. Detta är en Swiss-liknande
optimeringsmodell, inte en fullständig FIDE-lottning. Färghistorik och gränser
för upprepade färger ingår inte. Vid udda antal väljer anroparen frirond och
tar bort den spelaren före lottningen. Uppdatera poäng, färgbalans och
motståndarhistorik efter varje omgång.
