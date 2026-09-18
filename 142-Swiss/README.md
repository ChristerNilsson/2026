# Begriplig Swiss-lottning i Python

Programmet läser JSON och ger nästa ronds motståndare, vit/svart och eventuell
frirond. Det använder bara Pythons standardbibliotek (Python 3.10 eller senare).
Spelare deltar om de inte är exkluderade för ronden. Vinst ger 1 poäng, remi ½ och
förlust 0. Vid udda antal deltagare får en spelare frirond och 1 poäng.

Detta är en **förenklad Swiss-algoritm**, där begriplighet prioriteras.
Den återger inte JaVaFo exakt och är inte en fullständig implementation av
FIDE Dutch. Ingen Java eller annan lottningsmotor används.

## Körning

Läs de 54 spelarna direkt från `54.txt`:

```powershell
python swiss.py tournament54.json --players 54.txt -o next_round54.json
```

Varje textrad innehåller namn följt av Elo, separerade med mellanslag eller
tabbar. Namn med flera ord och titlar behålls. Tomma rader hoppas över.
Spelar-id tilldelas i filordning: första spelaren är 1, andra är 2, osv.
Behåll filordningen under turneringen. Filen läses som UTF-8.

Med `--players` ska JSON-filen bara innehålla rondinställningar och resultat,
inte en egen `players`-lista. `tournament54.json` börjar med tom rondhistorik;
lägg in resultaten för alla 54 spelare efter varje rond. Loggen blir
`next_round54.log`. `example.json` innehåller samma 54 spelare direkt i JSON
och kan köras utan `--players`.

```powershell
python swiss.py example.json
python swiss.py example.json -o next_round.json
python -m unittest -v
```

Terminalen skriver alltid lottningen på en enda rad, till exempel
`[[28,1],[2,29],[31,3]]`, även när du använder `-o`. Vid frirond läggs
`{"bye": id}` sist i listan. Kopiera raden till `rounds` i JSON-filen och
lägg till resultatet (0, 1 eller 2) som tredje värde i varje parti efter spel.
Med `-o` sparas dessutom hela utdataobjektet med rondnummer i den angivna filen.
Samma kopierbara rad står sist i loggfilen under `Lottning att kopiera:`.

Varje körning skriver också en separat loggfil. Med `-o next_round.json` blir
den `next_round.log`; utan `-o` blir den `example.log`. Välj annat namn med:

```powershell
python swiss.py example.json -o next_round.json --log lottning.log
```

Loggen visar spelarnas poäng och färghistorik, avvisade motståndare och färgval,
prioriteringen mellan kandidater, provade parningar, återvändsgränder och när
sökningen backar. Sist visas den valda lottningen eller ett fel, till exempel
att sökgränsen nåtts. Loggfilen skrivs om vid varje körning och kan bli stor
vid omfattande sökning.

Loggen anger fullständiga sökvägar till indata och utdata. Efter en lyckad
körning visas också var lottningen sparades. Om en körning misslyckas och
utdatafilen redan finns får du ett meddelande om att den kan innehålla en gammal
lottning. Läs alltid körningens felmeddelande innan du använder resultatfilen.

Testerna omfattar 106 simulerade ronder med varierande resultat och frånvaro,
inklusive en turnering med 54 spelare över 11 ronder. De kontrollerar bland annat
spelar-id, exkluderingar, poäng, färggränser, återkommande möten och frironder.

Från annan Pythonkod:

```python
import json
from swiss import pair_next_round

with open("example.json", encoding="utf-8") as f:
    tournament = json.load(f)
next_round = pair_next_round(tournament)
```

För loggning från Python, skicka en öppen textfil:

```python
with open("lottning.log", "w", encoding="utf-8") as log:
    next_round = pair_next_round(tournament, log=log)
```

## Så fungerar sökningen

Den centrala funktionen är `Swiss.search` i `swiss.py`:

1. Ta den högst placerade spelaren som ännu inte fått motståndare.
2. Lista möjliga motståndare som spelaren inte redan mött.
3. Uteslut par där ingen tillåten färgfördelning finns.
4. Prova i ordning: minst poängskillnad, bäst färgpreferenser och därefter
   en delning av gruppen i övre/undre halva.
5. Lotta resten rekursivt. Om det misslyckas, backa och prova nästa motståndare.
6. Återvänd när hela ronden är lottad.

```text
lotta(kvar):
    om kvar är tom: returnera en tom lottning
    a = första spelaren i kvar
    för varje möjlig motståndare b, i prioritetsordning:
        resten = lotta(kvar utan a och b)
        om resten lyckades: returnera [(a, b)] + resten
    returnera misslyckande
```

I första ronden med åtta spelare blir utgångspunkten 1–5, 2–6, 3–7, 4–8.
Senare är poängen viktigare än startnumret. Om två spelare på samma poäng inte
kan paras, prövar sökningen andra motståndare, även i lägre poänggrupper.

Den första kompletta lösningen väljs. Algoritmen **minimerar inte den sammanlagda
poängskillnaden för hela ronden**; prioriteringen är lokal för varje val. Den
planerar inte framtida ronder. Det gör koden enklare att följa, men kan ge sämre
lottningar än en fullständig Dutch-motor.

Redan undersökta restgrupper sparas i ett minne (`lru_cache`). Färgvalet för ett
par påverkar inte andra partier i samma rond, så endast dess bästa färgval behöver
provas. Sökningen kan ändå bli dyr i svåra fall. Efter 200 000 nya söktillstånd
avbryts den med ett tydligt fel. Gränsen kan ändras:

```powershell
python swiss.py example.json --max-nodes 1000000
```

## Färger och frirond

- Ingen spelare får tre vita eller tre svarta partier i följd.
- Skillnaden mellan antalet vita och svarta får vara högst två efter nästa parti.
- Vid val mellan tillåtna färger prioriteras den starkare färgpreferensen.
  Lika styrka avgörs av den högre placerade spelarens preferens, därefter startfärgen.
- Frirond räknas inte som ett parti eller en färg. Den prövas först för den
  lägst placerade spelare som inte tidigare fått frirond. Om resten inte kan
  lottas prövas nästa berättigade spelare.

Programmet gör inga undantag från färggränserna i sista ronden. Det kan därför
säga att lottning är omöjlig i ett läge som en fullständig FIDE-motor kan hantera.
Det skiljer mellan omöjlig lottning och uppnådd sökgräns.

## JSON-format

Se `example.json` för 54 spelare inför första ronden. Ett minimalt exempel:

```json
{
  "total_rounds": 3,
  "initial_colour": "white",
  "players": [
    [1, 2100, "Anna"],
    [2, 1900, "Bo"],
    [3, 1800, "Cecilia"]
  ],
  "rounds": [
    [
      [1, 2, 1],
      {"bye": 3}
    ]
  ]
}
```

`rounds: []` betyder att första ronden ska lottas. Varje senare post är en hel,
färdigspelad rond i tidsordning. Spelare anges som `[id, elo, namn]` och
partier som `[vit, svart, resultat]`. Resultatet gäller alltid vit:

- `0`: vit förlorade, svart vann.
- `1`: remi.
- `2`: vit vann, svart förlorade.

Exempel: `[3, 4, 0]` betyder att spelare 3 hade vit och förlorade mot spelare 4.
Koderna motsvarar halvpoäng: `2` ger en vanlig turneringspoäng.
Frirond anges fortfarande med ett objekt, till exempel `{"bye": 3}`.

Alla deltagande spelare måste förekomma exakt en gång per rond. Walkover och
acceleration ingår inte.

`excluded_players` anger frånvarande spelar-id **per rond**:

```json
"excluded_players": [[13, 26, 27, 30, 43, 50], [], [13]]
```

Första listan gäller rond 1, andra rond 2 och tredje rond 3. En saknad lista
betyder att ingen är exkluderad den ronden. För att utesluta någon flera ronder
anges id:t i varje berörd lista. Exkluderade spelare får ingen motståndare,
ingen frirond och inga poäng. Deras färghistorik och tidigare resultat bevaras
så att de kan återkomma. De ska inte finnas med i rondens resultatlista.
Behåll listorna för redan spelade ronder. Frirond avgörs av antalet deltagande
spelare, inte hela spelarlistans storlek. Om alla är exkluderade blir lottningen tom.

`id` är ett unikt positivt heltal som anges för varje spelare.
Samma id används i partierna; namn behöver inte vara unika.
Startnumren bestäms av fallande Elo, och listordningen avgör vid lika Elo.
Behåll Elo och listordning under turneringen. Spelar-id är oberoende av det
interna startnumret: ett id ändras inte när spelarna sorteras efter Elo.

`initial_colour` är `white` (standard) eller `black`. I första ronden anger den
startfärgen för udda positioner bland deltagande spelare i ratingordning,
efter att exkluderade spelare tagits bort. Jämna positioner får motsatt färg.
Spelar-id och permanenta startnummer ändras inte. I senare ronder styr
färghistoriken; om den inte avgör används det permanenta startnumret.
`total_rounds` behövs för att inte lotta efter turneringens slut.

Utdata innehåller `round`, `pairings` och `bye`. Varje parti är `[vit, svart]`
med spelarnas id. Listordningen anger bordsordningen. `bye` är spelar-id för
frirond eller `null`:

```json
{
  "round": 2,
  "pairings": [[6, 1], [2, 3], [4, 5]],
  "bye": null
}
```

Indata ändras inte. När ronden är spelad, lägg till resultat som tredje värde
i varje parti, till exempel `[6, 1, 2]`. Lägg även till `{"bye": id}` om någon
fick frirond, och lägg hela rondlistan sist i `rounds` innan du lottar igen.

## Bakgrund

[JaVaFo:s manual](https://www.rrweb.org/javafo/aum/JaVaFo2_AUM.htm) beskriver
referensmotorns gränssnitt.
[FIDE:s Dutch-regler före februari 2026](https://handbook.fide.com/chapter/C0403Till2026)
har betydligt fler prioriteringar än denna förenkling, bland annat historik för
upp-/nedflyttning mellan poänggrupper och bestämd ordning mellan kandidater.
Här används reglerna som bakgrund, inte som ett påstående om full överensstämmelse.
