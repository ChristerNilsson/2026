# RPN Game

Ett lokalt webbläsarspel för två spelare. Båda får samma följd av slumpade tal mellan 1 och 10 och försöker nå ett gemensamt måltal med RPN-räkning.

## Starta

Öppna `index.html` i en webbläsare. Spelet behöver ingen installation eller byggprocess. Det fungerar även på iPad i stående och liggande läge.

## Så spelar man

1. Varje spelare börjar med en tom stack och en egen kö med tio synliga tal.
2. Klicka på ett av de två nedersta talen i kön. Talet läggs längst ner i den synliga stacken och ett nytt tal fyller på kön uppifrån.
3. När stacken innehåller minst två värden kan du trycka på `+`, `−`, `×` eller `÷`. Knappen använder de två nedersta värdena. För `−` och `÷` är det äldre av de två talen vänster operand: `6 9 −` ger `−3`.
4. Division går bara att använda när resultatet blir ett heltal.
5. Målet är nått när stacken innehåller enbart måltalet. Du kan ångra hela vägen tillbaka till en tom stack eller avsluta ditt försök med **Ge upp**.

**Level** är antalet knapptryck i den kortaste lösningen. Både ett talklick och en räkneknapp räknas som ett drag. Spelet börjar på Level 3. En färdig RPN-beräkning använder alltid ett udda antal drag, så nivåerna går 3, 5, 7 och vidare. Om någon når målet på Level drag ökar nästa nivå; annars sjunker den när båda försöken är avslutade.

## Tid och resultat

Varje talklick och räkneknapp ger ett tillägg på 10 sekunder. Totaltiden är förfluten tid plus dessa tillägg. **Ångra** ger inget nytt tillägg, men tidigare knapptryck räknas fortfarande. Tiden stannar för en spelare när målet nås. Den spelare som når målet med lägst totaltid vinner.

När båda spelarna har nått målet eller avslutat sina försök blir **Visa vägar** tillgänglig. Den öppnar en separat resultatsida med spelarnas drag i vänster och höger kolumn och en bästa lösning i mitten. Räkneknappar visas där som sina resultat: `6 9 ×` visas som `6`, `9`, `54` på tre rader. Tidsberäkningen visas också där. **Nytt spel** på resultatsidan startar nästa nivå.

## Filer

- `index.html` – spelvyn.
- `script.js` – spelregler, nivågenerering och tidsberäkning.
- `style.css` – layout för dator, iPad och mindre skärmar.
- `results.html` – resultatsidan.
