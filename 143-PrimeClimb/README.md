# RPN Game

[Try it!](https://christernilsson.github.io/2026/143-PrimeClimb/)

Ett lokalt webbläsarspel för två spelare. Båda får samma följd av slumpade tal mellan 1 och 10 och försöker nå ett gemensamt måltal med RPN-räkning.

## Starta

Öppna `index.html` i en webbläsare. Spelet behöver ingen installation eller byggprocess. Det fungerar även på iPad i stående och liggande läge.

## Så spelar man

1. Varje spelare börjar med en tom stack och en egen kö med tio synliga tal.
2. Klicka på ett av de två valbara talen under kön. Talet läggs längst ner i den synliga stacken. Just den valda platsen ersätts av köns nedersta tal, medan det andra valbara talet ligger kvar. Ett nytt tal fyller på kön uppifrån.
3. När stacken innehåller minst två värden kan du trycka på `+`, `−`, `×` eller `÷`. Knappen använder de två nedersta värdena. För `−` och `÷` är det äldre av de två talen vänster operand: `6 9 −` ger `−3`.
4. Division går bara att använda när resultatet blir ett heltal.
5. Målet är nått när stacken innehåller enbart måltalet. Du kan ångra hela vägen tillbaka till en tom stack eller avsluta ditt försök med **Ge upp**.

**Level** är antalet räkneoperationer i den kortaste lösningen. Talklick räknas inte in i Level. Spelet börjar på Level 1 och nivåerna går sedan 1, 2, 3 och vidare. Om någon når målet med Level räkneoperationer ökar nästa nivå med ett; annars sjunker den med ett när båda försöken är avslutade.

## Tid och resultat

Varje talklick och räkneknapp ger ett tillägg på 10 sekunder. Totaltiden är förfluten tid plus dessa tillägg. **Ångra** ger inget nytt tillägg, men tidigare knapptryck räknas fortfarande. Tiden stannar för en spelare när målet nås. Den spelare som når målet med lägst totaltid vinner.

När båda spelarna har nått målet eller avslutat sina försök blir **Visa vägar** tillgänglig. Den öppnar en separat resultatsida med spelarnas drag i vänster och höger kolumn och en bästa lösning i mitten. Räkneknappar visas där som sina resultat: `6 9 ×` visas som `6`, `9`, `54` på tre rader. Tidsberäkningen visas också där. **Nytt spel** på resultatsidan startar nästa nivå.

Efter avslutad omgång kan `Enter` användas för **Visa vägar**. På resultatsidan startar `Enter` ett nytt spel.

## Tangentbord

Båda spelarna kan använda samma tangentbord samtidigt. Tangenterna är placerade på varsin sida:

| Funktion | Spelare 1 | Spelare 2 |
| --- | --- | --- |
| Välj de två nedersta talen | `Q`, `Z` | `Y`, `N` |
| `+`, `−`, `×`, `÷` | `A`, `S`, `D`, `F` | `H`, `J`, `K`, `L` |
| Ångra | `R` | `O` |
| Ge upp eller fortsätt | `E` | `I` |

Tangenterna styr alltid sin egen spelare. Mus och touch kan användas parallellt.

## Filer

- `index.html` – spelvyn.
- `script.js` – spelregler, nivågenerering och tidsberäkning.
- `style.css` – layout för dator, iPad och mindre skärmar.
- `results.html` – resultatsidan.
