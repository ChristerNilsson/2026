# Schackstudion

Analysera en PGN med Python och en lokal Stockfish. Öppna sedan `index.html` och välj JSON-filen. Webbläsaren kör ingen motor och behöver ingen server. Projektet körs lokalt.

## Förbered

Installera Python 3.10+ och en Stockfish-version för ditt operativsystem från https://stockfishchess.org/download/ . Packa upp motorn och ange sökvägen till dess körbara fil:

```powershell
python -m pip install -r requirements.txt
python analyze.py bent-larsen-01.pgn --engine "C:\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe" --nodes 100000 -o analysis.json
```

Ange exakt en budget: exempelvis `--nodes 100000` eller `--seconds 1`. Pythonprogrammet skapar en enda analys; webbappen har inget analysval. Analysen omfattar alla lagliga drag före varje huvudlinjedrag, för alla partier i filen. Kommentarer och sidovarianter ignoreras. Även PGN med startposition från FEN stöds. Endast standardschack stöds.

Budgeten gäller per position med MultiPV för alla lagliga drag. Vid mycket liten budget kan motorn missa varianter; då kompletteras dessa med separata sökningar med samma budget. Det kan göra att den totala analyskostnaden överskrider budgeten. Resultaten är uppskattningar, särskilt med små budgetar. Sekunder och noder är sökbudgetar, inte Elo-tal. JSON sparas först när hela analysen lyckats.

## Övning

1. Öppna `index.html`, ladda `analysis.json`, välj parti, färg och tillåten förlust i bondenheter. Tryck på Starta.
2. Klicka pjäs och målruta. Vid promotion väljer du pjäs.
3. Det verkliga PGN-draget visas på brädet. Tryck Fortsätt för nästa uppgift. Motståndarens drag spelas automatiskt från PGN.

Du börjar med tio liv. PGN-draget kostar aldrig ett liv (regel 3). Ett annat drag kostar ett liv om dess förlust jämfört med bästa draget är **större än** gränsen. Ett likvärdigt alternativ behåller livet. Även efter ett avvikande drag fortsätter övningen längs PGN-partiet. När liven tar slut stannar övningen. Senaste verkliga dragets båda rutor markeras alltid. Inställningsändringar börjar gälla när du startar en ny övning.

Analysbudgeten bestäms enbart när Pythonprogrammet körs. Motståndaren följer PGN. Fria motståndardrag skulle kräva analys av ett förgreningsträd eller en motor under övningen.

## JSON

`schema_version: 2`, `profiles` och `games`. Varje parti har `headers`, `positions` och `final_fen`. Varje position lagrar FEN före draget, en gemensam lista `moves` med `[uci, san]`, indexet `played` för PGN-draget samt `analyses` i profilernas ordning. Varje analys är en sorterad lista `[dragindex, värdering]`: ett heltal betyder centibönder och en sträng som `"#3"` betyder matt i tre drag. Värderingen gäller spelaren vid draget.

Upprepade dragtexter, `ply`, `turn`, `after_fen`, `depth`, `sort_score` och `loss_cp` lagras inte. Webbläsaren räknar fram de värden den behöver; nästa positions FEN är föregående positions slutposition. JSON skrivs utan indrag. `profiles` innehåller exakt en analysbudget. Äldre filer i format 1 kan läsas om de innehåller en enda analys.

Mattvärderingar sorteras med ett tekniskt värde på 100 000 centibönder; mattförluster använder samma skala. Matt visas separat i gränssnittet.

Till höger visas ett löpande protokoll med dragnummer och kolumner för vit och svart. För varje färg visas valt/spelat drag, PGN-drag, utvärdering och livsförlust. Endast besvarade drag och redan spelade motståndardrag förs in. Kommande drag lämnas tomma. Om ditt val avviker visar PGN-kolumnen vilket drag som faktiskt spelas på brädet. Utvärderingen gäller draget i kolumnen Drag och visas alltid ur vits perspektiv, även för svart: positivt för vit och negativt för svart. Detta gäller även mattvärden och återkopplingen efter svaret. JSON-värden och livsberäkning använder fortfarande dragspelarens perspektiv. Protokollet töms när en ny övning startas.

Koordinater visas enbart längs vänsterkanten och nederkanten och följer brädets orientering. Brädet har bruna/beige rutor och lokala cburnett-pjäser från Lichess; se [pjäslicensen](assets/pieces/README.md).

Pythonintegrationen använder [python-chess UCI-API](https://python-chess.readthedocs.io/en/latest/engine.html).
