# Simple Swiss

Python 3.10+ och Blossom via NetworkX.

`python main.py` läser turneringen från `19069.json` och personliga frironder
från `19069.txt`. Varje rad efter rubriken innehåller spelarens namn följt av
rondnummer, exempelvis `Mikael Lundberg 3 5`. Personliga frironder ger 0,5 poäng
och spelaren undantas från lottningen i dessa ronder. Tidigare personliga
frironder räknas en gång och påverkar inte färg- eller motståndarhistoriken.
Okända eller tvetydiga namn stoppar körningen med ett felmeddelande.

Programmet visar turnering och rond, personliga frironder, eventuell information
om uppskjutna partier och den slutliga lottningen med vitt och svart.
Bordslistan sorteras på fallande summa av de två spelarnas poäng.
Vid lika summa behålls den tidigare ordningen.
Trace-utskrifter av spelarstatistik, parkostnader och Blossom-försök visas inte.
`pair_round` kan fortfarande rapportera gruppförsök via den valfria callbacken
`on_group` vid felsökning.

```powershell
python -m pip install -r requirements.txt
python swiss.py
python -m unittest -v
```

```python
from swiss import Player, pair_round, cost_matrix

players = [
    Player("Anna", 2100, points=2, color_balance=1),
    Player("Bo", 2000, points=2, color_balance=-1),
    Player("Cia", 1900, points=1),
    Player("Dan", 1800, points=1),
]
matrix = cost_matrix(players)
for game in pair_round(players):
    print(game.white.id, game.black.id, game.cost)
```

Varje tillåten cell innehåller parkostnaden

`abs(abs(i-j) - n/2) ** 1.01`.

`i` och `j` är positioner i fallande Elo-ordning inom poänggruppen;
lika Elo avgörs med spelar-id. `n` är gruppens storlek. Vid lottning används
hela den aktuella, eventuellt utökade gruppens Elo-ordning och storlek, oavsett
spelarnas poäng. `cost_matrix` behandlar alla angivna spelare som en grupp.
Färgbalans är antal vita minus antal svarta partier. Walkover-partier
(`1w` och `0w`) påverkar inte färgbalansen. Ett par tillåts bara om
`balance_i + balance_j` är -1, 0 eller 1. För tillåtna par läggs dessutom en
liten mjuk färgkostnad till, som minimerar total färgbalans efter partiet utan
att göra färgen till en hård barriär. Cellen innehåller avvikelsen från önskat
rankavstånd upphöjd till 1,01, plus 1/20 av den bästa möjliga färgkostnaden
för det paret. Exponenten ger större avvikelser en högre relativ kostnad.
Poäng används för den inledande gruppindelningen och bordslistans sortering.

Matrisen är symmetrisk och följer indatas spelarordning. `None` betyder
diagonal, förbjudet åter möte eller otillåten summerad färgbalans. Historik i endera spelarens `opponents`
räcker för att förbjuda paret. Blossom minimerar den aktuella gruppens totalkostnad.
Potensen beräknas med flyttal och resultatet lagras exakt som ett rationellt tal.
Inför Blossom skalas kostnaderna till heltal utan ytterligare avrundning.
Färg väljs därefter genom att minimera summan av spelarnas absoluta
färgbalanser efter partiet; vid lika utfall får den först angivna spelaren vitt.

`Weights` används endast för spelaröversiktens individuella statistik;
lottningen tar inga vikter.
Lottningen delar först upp spelarna efter fallande poäng. En udda grupp flyttar
sin lägst Elo-rankade spelare ned till nästa poänggrupp, uppifrån och ned.
Varje grupp sorteras på fallande Elo oavsett spelarnas ursprungliga poäng.
Blossom försöker hitta en fullständig parning i första gruppen. Om det inte går
hämtas de två högst Elo-rankade spelarna från närmaste kvarvarande lägre grupp.
Den utökade gruppen sorteras om och försöket upprepas tills en lösning finns
eller spelarna tar slut. Därefter behandlas nästa kvarvarande grupp.
Avslutade parningar omprövas inte; algoritmen kan därför misslyckas även om
en annan parning av en tidigare grupp skulle möjliggöra en fullständig rond.
Spelarnas poäng och historik ändras inte av gruppflyttningarna.

Detta är en Swiss-liknande
optimeringsmodell, inte en fullständig FIDE-lottning. Färghistorik och gränser
för upprepade färger ingår inte. Vid udda antal väljer anroparen frirond och
tar bort den spelaren före lottningen. Uppdatera poäng, färgbalans och
motståndarhistorik efter varje omgång.
