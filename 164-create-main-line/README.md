# Schackträd

[Try it!](https://christernilsson.github.io/2026/155-chess-tree/)  

python main-line.py 1 --stockfish "\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe"

Konvertera PGN från kommandoraden, headless:

```powershell
python -m pip install -r requirements.txt
python pgn2json.py "Christer-Nilsson"
python pgn2json.py "Robert-James-Fischer-60"
```

Starta Go Live i projektets rot och öppna `<katalog>/W.html` eller `<katalog>/B.html`.
Katalogen ligger direkt under gemensamma `index.js` och `index.css`. HTML-vyerna
laddar dessa filer och sin egen JSON direkt, utan omdirigering eller query-sträng.
Adressen stannar exempelvis på `Christer-Nilsson/B.html`.

Konverteraren läser PGN-filer rekursivt och skriver `W.json` och `B.json` i indatakatalogen.
Partier där hela vits namn finns i katalognamnet hamnar i W; övriga hamnar i B.
Jämförelsen bortser från stora och små bokstäver. Sidovarianter tas inte med.

Varje JSON-fil innehåller en lista med partier med `White`, `Black`, `Result`, `Date`
och `ChapterURL`. `moves` innehåller mellanslagsseparerade SAN-drag, exempelvis `"e4 e5"`.
`evals` innehåller motsvarande centipawns ur vits perspektiv, exempelvis `"20 -15"`.
Saknad eval markeras med `?`; matt med ±1000000 centipawns.
Startpositionens eval sparas som `initialEval` när den finns.

Vyn läser JSON direkt med fetch via Go Live. Ingen separat server behöver startas.

Partier sorteras alfabetiskt efter SAN-drag, kolumn för kolumn. Tabellen visar högst
34 halvdrag och lämnar gemensamma inledningar med föregående parti tomma.
Efter dragen visas orsak, resultat och ChapterURL. Spelarnamn och datum finns i radens tooltip.

Under varje dragcell centreras den absoluta förändringen från föregående positions eval.
En centrerad heldragen linje visar förändringen: 50 cp (0,5) täcker 50 procent
av cellens bredd. Bredden avrundas till närmaste tiotal procent, vilket ger tio
synliga bredder (10–100 procent); noll ger ingen linje. Från 100 cp (1,0) täcker
linjen hela cellen utan marginaler.
Tooltipen visar den exakta förändringen med tecken. Saknad eval ger ingen markering.
När ett gemensamt inledningsdrag döljs, döljs även dess eval-linje.

Visningen stannar vid första draget med absolut eval över 300 centipawns (A),
eller eval-skillnad över 100 centipawns (R). A har företräde och gränserna är strikta.
R jämför bara angränsande positioner som båda har eval. Vid partiets slut visas `Slut:Result`.
Vid gränsen på 34 halvdrag visas sista eval, eller `A?` om den saknas.


## Huvudlinje med Stockfish

```powershell
python -m pip install -r requirements.txt
python main-line.py 1
python main-line.py 1 --stockfish "C:\verktyg\stockfish.exe"
```

Standardsökvägen till Stockfish är `\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe`.
Ange `--stockfish` för att använda en annan sökväg. Motorn använder en tråd, full spelstyrka
(`Skill Level=20`, `UCI_LimitStrength=false`). Första parametern anger miljoner
söknoder per halvdrag: `1` ger 1 000 000 noder, `2` ger 2 000 000 och `0.5` ger 500 000.
Tryck Enter för nästa 10 heldrag (20 halvdrag). Alla lagliga drag analyseras med MultiPV inom
den gemensamma nodbudgeten. Vid lika bästa värdering väljs det första draget.
Endast det valda draget visas med värdering i bönder ur vits perspektiv; `#` anger matt.
Partiet slutar vid matt eller remi (inklusive när remi kan krävas).
Avsluta med Ctrl+C.
