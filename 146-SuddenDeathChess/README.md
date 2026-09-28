# Sudden Death Chess

Schack mot Stockfish med svenskt fönstergränssnitt, två förlustgränser och
valbar betänketid för båda spelarna. Standard är **15 minuter + 10 sekunder per utfört drag**.

## Starta

Python 3.10 eller senare med Tkinter krävs (ingår normalt i Python för Windows).
Installera Stockfish separat från https://stockfishchess.org/download/ och packa upp filen.

```powershell
python -m pip install -r requirements.txt
python main.py
```

Stockfishs sökväg är hårdkodad till
`C:\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe`.
Placera den körbara filen där. Ange gränserna, välj färg och tryck **Starta parti**.
Standardvalet **Slumpa** lottar din färg på nytt vid varje partistart.
Ange **Betänketid (min)** och **Tillägg per drag (s)** före start, exempelvis
5 och 3 för 5+3. Starttiden kan anges med decimaler (t.ex. 0,5 för 30 sekunder)
och tillägget som ett heltal från 0. Valet låses för det pågående partiet
och används av båda klockorna, Stockfish och PGN-loggen.
Klicka på en pjäs och sedan målrutan. Vid promovering väljer du D/T/L/S.
Stockfishs senaste drag markeras med gulgröna start- och målrutor.
Markeringen försvinner när du har gjort ditt drag; din valda pjäs
markeras fortfarande i gult.

Pjäserna använder Lichess uppsättning **Cburnett** av Colin M. L. Burnett.
PNG-bilder och SVG-original ingår lokalt; ingen extra installation krävs.
Se [bildkällor och licens](assets/pieces/cburnett/README.md).

## Regler

- Alla värderingar gäller människans perspektiv, även när du spelar svart.
- Absolut gräns **300 cp** betyder förlust när värderingen efter ditt drag
  är **lägre än −300 cp**.
- Relativ gräns **100 cp** betyder förlust när ditt drag tappar **mer än
  100 cp jämfört med bästa lagliga draget** i samma ställning.
- Exakt på gränsen är tillåtet. En bonde motsvarar 100 cp.
- Gränserna låses när partiet startar. De kontrolleras efter varje mänskligt
  drag. Efter båda sidors drag analyserar Stockfish både fritt och med det utförda draget som enda
  tillåtna rot-drag, till djup 18 eller högst fem sekunder per analys.
  De två analyserna kan tillsammans ta upp till tio sekunder.
  Klockorna pausas under kontrollanalysen.
- **Max s/drag (tomt = auto)** anger datorns maximala betänketid per drag
  och låses när partiet startar. Standardvärdet är 1 sekund. Lämna fältet
  tomt för att låta Stockfish disponera tiden själv utifrån klockorna och
  det valda tillägget. Decimaltal går bra, exempelvis `2,5`.
  Kontrollanalyser och övningsanalyser har fortfarande högst fem sekunder
  per analys. Valet sparas i PGN-taggen `EngineMaxMoveTime`.
- Schackmatt och automatiska remier avslutar partiet före gränskontrollen.
  **Kräv remi** används för trefaldig upprepning och femtiodragsregeln,
  även när ett lagligt nästa drag skulle möjliggöra kravet.
- Mattvärderingar omvandlas till ±100 000 cp, justerat för mattavstånd.
  En upptäckt forcerad matt mot dig överskrider därmed normala gränser.

Värderingen är Stockfishs uppskattning vid det angivna sökdjupet, inte en
matematisk garanti. Två separata sökningar kan ge något olika uppskattningar.
Varje analys begränsas till fem sekunder, även för försök i övningen.

## Träna på misstaget

Efter en förlust på någon av utvärderingsgränserna visas ställningen före
misstaget, ditt drag och dess värdering. Partiet är avslutat och klockorna
står stilla. Försök hitta ett bättre drag genom att spela det på brädet.
Du får återkoppling på ditt försök och kan försöka flera gånger; ställningen
behålls. Alternativa drag analyseras också, så en förbättring behöver inte
vara exakt det drag Stockfish valde.

**Visa Stockfishs svar** visar bästa draget, dess värdering och hur mycket
ditt ursprungliga drag tappade. Hittar du själv det sparade bästa draget
visas svaret direkt. Du kan när som helst starta ett nytt parti när ingen
analys pågår. Övningen ändrar inte resultatet i det avslutade partiet.

## Partilogg och värderingar

Alla nya partier sparas automatiskt i **logg.pgn**, i samma katalog som
`main.py`. Filen uppdateras efter varje drag, efter analysen och när partiet
avslutas. Tidigare partier behålls utan att kontrollsparningar skapar kopior.
Även avbrutna partier sparas med resultatet `*`. Om fönstret stängs innan
analysen är klar finns draget kvar med kommentaren `Analysis pending.`.
Eventuella skrivfel visas längst ner i fönstret.

Draglistan är en tabell med en rad per dragnummer. Efter **Nr** kommer alla
vita kolumner (drag, värdering, bästa drag, bästa värdering), sedan motsvarande
svarta kolumner. Värderingarna visas ur ditt
perspektiv för båda färgerna, i cp eller mattavstånd (`#`). Alternativkolumnerna
är tomma när det utförda draget redan var Stockfishs bästa. Kolumnbredderna kan ändras
genom att dra i rubrikernas kanter.
Om Stockfish föredrar ett annat drag visas även det och dess värdering.
Vid gränsförlust är svaret dolt i gränssnittet tills du visar det i övningen;
PGN-filen innehåller det direkt. Övningsförsök ändrar inte det loggade partiet.

PGN innehåller datum, spelarfärger, resultat, avslutsorsak, `TimeControl`
(t.ex. `900+10` för 15+10), gränser och klockkommentarer (`[%clk ...]`). Värderingar sparas
med `[%eval ...]` **ur vits perspektiv**, i bondeenheter eller mattavstånd.
Ett avvikande bästa drag sparas både i kommentaren och som spelbar sidovariant
med egen värdering. Gränsförluster har `Termination "adjudication"`.

För att läsa flera partier med kommentarer och varianter i Lichess, skapa
en [studie](https://lichess.org/study) och importera `logg.pgn` via PGN-importen.
Filen är standard-PGN och kan även öppnas i andra schackprogram.

## Testa

```powershell
python -m unittest -v
```

Motorintegrationen använder python-chess UCI-gränssnitt:
https://python-chess.readthedocs.io/en/latest/engine.html
