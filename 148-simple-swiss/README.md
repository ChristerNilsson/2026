# Simple Swiss

Python 3.10+ och Blossom via NetworkX.

`python main.py` läser turneringen från `19069.json` och personliga frironder
från `19069.txt`. Varje rad efter rubriken innehåller spelarens namn följt av
rondnummer, exempelvis `Mikael Lundberg 3 5`. Personliga frironder ger 0,5 poäng
och spelaren undantas från lottningen i dessa ronder. Tidigare personliga
frironder räknas en gång och påverkar inte färg- eller motståndarhistoriken.
Okända eller tvetydiga namn stoppar körningen med ett felmeddelande.

Före lottningen visas alla deltagares lottningspoäng, signerade färgbalans,
index, gruppens medelindex, avstånd till medelindex och individuell viktad total.
Översikten inkluderar personliga frironder och markerar dessa. Varje poänggrupp
sorteras efter fallande Elo och sedan spelar-id, med index från 0. Medelindex är
`(gruppstorlek - 1) / 2`; avståndet är `abs(index - medelindex)`.
Totalen är `w_points * points + w_rank * avstånd + w_color * abs(color_balance)`.
Denna individuella statistik ändrar inte lottningens parkostnader. Översiktens
grupper inkluderar frånvarande spelare; lottningens grupper innehåller endast
de spelare som ska paras.

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
weights = Weights(points=10000, rank=100, color=1)
matrix = cost_matrix(players, weights)
for game in pair_round(players, weights):
    print(game.white.id, game.black.id, game.cost)
```

Varje tillåten cell innehåller parkostnaden

`(w_points * abs(points_i - points_j) + w_rank * abs(abs(i-j) - n/2)) ** 1.01`.

`i` och `j` är positioner i fallande Elo-ordning inom poänggruppen;
lika Elo avgörs med spelar-id. `n` är gruppens storlek. För olika poänggrupper
används deras förenade Elo-sorterade grupp som en uttrycklig utvidgning av formeln.
Färgbalans är antal vita minus antal svarta partier. Walkover-partier
(`1w` och `0w`) påverkar inte färgbalansen. Ett par tillåts bara om
`balance_i + balance_j` är -1, 0 eller 1. Färgbalansen ingår inte i kostnaden.
Poängdiff och avvikelse från önskat rankavstånd beräknas separat.
Varje absolutvärde viktas innan komponenterna summeras, så att positiva och
negativa avvikelser inte kan ta ut varandra.

Matrisen är symmetrisk och följer indatas spelarordning. `None` betyder
diagonal, förbjudet åter möte eller otillåten summerad färgbalans. Historik i endera spelarens `opponents`
räcker för att förbjuda paret. Blossom minimerar hela omgångens totalkostnad.
Den viktade summan beräknas rationellt och upphöjs sedan till 1,01 med flyttal.
Matrisen lagrar dessa värden som rationella tal och skalar dem till heltal
utan ytterligare avrundning inför optimeringen.
Färg väljs därefter genom att minimera summan av spelarnas absoluta
färgbalanser efter partiet; vid lika utfall får den först angivna spelaren vitt.

Standardvikterna för parkostnaden är 10000 för poäng och 100 för avstånd.
Färgvikten används bara i spelaröversiktens individuella total.
Vikterna ger mjuka prioriteringar: 10000 garanterar inte att poängskillnad alltid
går före alla andra kriterier i en stor turnering. Detta är en Swiss-liknande
optimeringsmodell, inte en fullständig FIDE-lottning. Färghistorik och gränser
för upprepade färger ingår inte. Vid udda antal väljer anroparen frirond och
tar bort den spelaren före lottningen. Uppdatera poäng, färgbalans och
motståndarhistorik efter varje omgång.
