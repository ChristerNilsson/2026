# Sudden Death Chess

Schack mot Stockfish med svenskt fönstergränssnitt, två förlustgränser och
spel utan klockor. Datorns maximala tid per drag anges separat.

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
Inställningarna sparas i `settings.json` bredvid programmet när du startar
ett parti eller stänger fönstret, och läses in vid nästa programstart.
Välj **Hjärtan** mellan 1 och 7; standard är 5. Inställningarna låses under partiet.
Maximal datortid väljs i en kombobox med 0.001, 0.002, 0.005, 0.01, 0.02,
0.05, 0.1, 0.2, 0.5, 1, 2 och 5 sekunder. Tomt val finns inte längre.
Klicka på en pjäs och sedan målrutan. Vid promovering väljer du D/T/L/S.
Stockfishs senaste drag markeras med gulgröna start- och målrutor.
Markeringen försvinner när du har gjort ditt drag; din valda pjäs
markeras fortfarande i gult.

Pjäserna använder Lichess uppsättning **Cburnett** av Colin M. L. Burnett.
PNG-bilder och SVG-original ingår lokalt; ingen extra installation krävs.
Se [bildkällor och licens](assets/pieces/cburnett/README.md).

## Regler

- Visade värderingar gäller vits perspektiv: plus betyder att vit leder,
  minus att svart leder. Förlustgränserna beräknas ur människans perspektiv.
- Du börjar med valt antal hjärtan (standard 5). Ett gränsöverskridande kostar
  ett hjärta. När sista hjärtat förloras avslutas partiet.
- Absolut grundgräns **300 cp** ger gränserna **−300, −600 och −900 cp**
  efter noll, ett respektive två absoluta misstag. Relativa misstag höjer inte
  den absoluta gränsen. Värderingen måste understiga gränsen. Om båda gränserna
  överskrids på samma drag räknas det som ett absolut misstag och kostar ett hjärta.
- Relativ gräns **100 cp** kostar ett hjärta när ditt drag tappar **mer än
  100 cp jämfört med bästa lagliga draget** i samma ställning.
- Exakt på gränsen är tillåtet. En bonde motsvarar 100 cp.
- Gränserna låses när partiet startar. De kontrolleras efter varje mänskligt
  drag. Efter båda sidors drag analyserar Stockfish både fritt och med det utförda draget som enda
  tillåtna rot-drag, till djup 18 eller högst fem sekunder per analys.
  De två analyserna kan tillsammans ta upp till tio sekunder.
- **Max sek/drag** anger datorns maximala betänketid per drag
  och låses när partiet startar. Standardvärdet är 1 sekund.
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

När du tappar ett hjärta visas bästa draget direkt och ditt felaktiga drag
backas. Med hjärtan kvar fortsätter partiet från ställningen före misstaget.
I tabellen till höger visas det dåliga dragets text i rött och det bästa
dragets text i grönt tills du gör nästa drag.
Det finns ingen spelklocka. Den relativa gränsen ändras inte.
Återtagna drag markeras med ↶ i tabellen och noteras i PGN-kommentarer;
de ingår inte i partiets fortsatta dragföljd.

Efter förlusten av sista hjärtat visas ställningen före
misstaget, ditt drag och dess värdering. Partiet är avslutat.
Försök hitta ett bättre drag genom att spela det på brädet.
Du får återkoppling på ditt försök och kan försöka flera gånger; ställningen
behålls. Alternativa drag analyseras också, så en förbättring behöver inte
vara exakt det drag Stockfish valde.

Tabellen visar bästa draget och dess värdering direkt.
Du kan starta ett nytt parti när ingen
analys pågår. Övningen ändrar inte resultatet i det avslutade partiet.

## Partilogg och värderingar

Alla nya partier sparas automatiskt i **logg.pgn**, i samma katalog som
`main.py`. Filen uppdateras efter varje drag, efter analysen och när partiet
avslutas. Tidigare partier behålls utan att kontrollsparningar skapar kopior.
Även avbrutna partier sparas med resultatet `*`. Om fönstret stängs innan
analysen är klar finns draget kvar med kommentaren `Analysis pending.`.
Eventuella skrivfel visas längst ner i fönstret.

Draglistan är en tabell med en rad per dragnummer. Alla vita kolumner
(bästa värdering, bästa drag, värdering, drag) ligger till vänster,
**Nr** i mitten och motsvarande svarta kolumner till höger. Värderingarna visas ur vits
perspektiv för båda färgerna, i cp eller mattavstånd (`#`). Alternativkolumnerna
är tomma när det utförda draget redan var Stockfishs bästa. Kolumnbredderna kan ändras
genom att dra i rubrikernas kanter.
Om Stockfish föredrar ett annat drag visas även det och dess värdering.
Vid hjärtförlust visas svaret direkt. Övningsförsök efter avslutat parti ändrar
inte det loggade partiet.

PGN innehåller datum, spelarfärger, resultat, avslutsorsak, `TimeControl`
(`-` för spel utan klockor), gränser och antal hjärtan. Värderingar sparas
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
