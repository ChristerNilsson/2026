Detta lottningssystem utgår från Bergergrupper och har dessutom följande egenskaper:

1. De 66 deltagarna delas in i lika stora grupper, t ex n=12

2. Sista gruppen måste ligga i storleksintervallet n till 2*n-1. Dvs 12 till 23.

3. Sista gruppen lottas med Schweizer.

4. Om någon inte kan spela, ersätts den personen med någon av de bästa i gruppen under. Övriga i gruppen behåller sin positioner. Detta för att Bergerlottningen ska vara så stabil som möjligt.

5. Om grupp A, påverkas av ett avhopp, påverkar det alltså alla följande grupper.

6. Personliga frironder hanteras också med detta ersättningssystem. Med skillnaden att personen kommer tillbaka.

7. Deltagarna sorteras i strikt [elo, signatur]. Däremot kan ronderna vara omkastade.

## Webbgränssnitt

Öppna `index.html` i webbläsaren och välj `turnering.json` med **Öppna JSON**. Ingen installation eller server behövs. Om sidan körs via en webbserver läses `turnering.json` automatiskt från samma katalog.

1. Klicka **Lotta rond 1**. Appen använder de fasta mötena i filens `lottning`, där ersättarna redan satts in på rätt platser. En ny JSON-fil laddas ner, och den gemensamma bordslistan visas.
2. Fokusera ett resultatfält. Tryck `1` för vit vinst, `R` för remi, `0` för svart vinst eller mellanslag för ospelat. Fokus går vidare till nästa bord. Pil upp/ned flyttar mellan borden. Klick på resultatfältet öppnar också knappar för inmatning.
3. Klicka **Spara JSON** för att exportera resultaten. Lokalt utkast sparas även vid varje ändring; knappen **Återställ lokalt utkast** läser tillbaka det efter att sidan öppnats på nytt. Utkastet ersätter inte en exporterad säkerhetskopia.
4. När alla lottade partier är rapporterade kan nästa rond lottas. Varje lottning skapar en ny nedladdning med samtliga hittills inmatade resultat. Rondknapparna visar tidigare ronder för kontroll och rättning.

Resultaten lagras i `ronder[].resultat`, med en sträng per grupp i samma ordning som gruppens par i `lottning`: `1` = 1–0, `r` = remi, `0` = 0–1 och mellanslag = ospelat. Exempel: `"A": "1r01r0"`. Den äldre exempelnyckeln `resultat:` läses också och normaliseras vid export. Källfilen skrivs aldrig över av appen.

Exporten lagrar vilka ronder som aktiverats i `app.lottadeRonder`. En ursprungsfil utan denna status börjar med **Lotta rond 1**, även om den innehåller förberedda möten för alla ronder. En exporterad fil återupptas vid senast lottade rond.

Schweizerlottningen är ännu inte implementerad. Dess bord visas som väntande i samma lista och deltagarna anges nedanför. Inga möten, färger eller resultat skapas för dessa spelare. Spärren inför nästa rond gäller därför tills vidare bara de lottade Bergerpartierna. Vid udda antal markeras att en frirond återstår att utse.

Förberedda gruppindelningar och möten läses från JSON-filen; appen räknar ännu inte om grupper vid nya avhopp eller nya personliga frironder. Om antalet kvarvarande deltagare (efter avhopp, utan att räkna bort personliga frironder) understiger totala antalet ronder stoppas fortsatt lottning.

Kontrollera logiken och inmatningsflödet med `node --test tournament.test.js app.test.js`. Appen har inga externa bibliotek eller nätberoenden.

