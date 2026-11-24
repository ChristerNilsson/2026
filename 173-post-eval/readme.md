[Try it!](https://christernilsson.github.io/2026/173-post-eval/)

Syfte:

Man ska spela ett parti schack mot stockfish.js. 
Efter varje drag ska man få möjlighet att se CPL, dvs Centi Pawn Loss, och då få chansen att ångra draget.
CPL ska vara numeriskt och även visa en färg.

html + js

Indata: 

* Eventuell FEN
* Eget lichess-elo
* antal tillåtna undon. Man får ångra samma halvdrag flera gånger
* domarens styrkebegränsning, t ex 1M noder, 1 sekund, 20 nivåer
* Betänketid t ex 15+10

Utdata:

* PGN
* Länk till Lichess

## Kör lokalt

Kör `node serve.mjs` från projektmappen och öppna <http://127.0.0.1:8080>.
Spelet körs i moderna webbläsare med WebAssembly. Motorn och schackreglerna
ligger i projektet, så själva partiet kan spelas utan internet.

Välj inställningar och klicka på **Starta parti**. Inställningarna fälls ihop
och kan öppnas igen. Klicka på en pjäs och sedan på målrutan. Efter varje
eget drag pausar klockorna och CPL visas bredvid draget under brädet.
Välj **Ok** eller **Undo**. När Stockfish har dragit fortsätter
partiet direkt. En ångring förbrukar ett försök och tar bort
dragets tidsinkrement. Speltiden som redan använts räknas fortfarande.

Ditt Lichess-Elo styr motståndarens spelstyrka. Stockfish fördelar sin
betänketid utifrån partiets klockor och inkrement. Domaren
jämför bästa draget med det spelade draget från samma position vid vald
sökgräns. Grönt står för 0–29 CPL, gult för 30–99 CPL och rött för 100 CPL
eller mer. Vid forcerad matt lämnas CPL-fältet tomt. Stockfish ger upp om
domaren värderar ställningen efter ditt godkända drag till minst 666
centibönders fördel för dig.

**Ladda ned PGN** sparar hela partiet. Lichess-länken öppnar den aktuella
ställningen. Klistra in PGN i analysbrädet på Lichess för att spela igenom
hela partiet, även från en egen FEN.

[Stockfish.js 17.1.0 (källkod, GPLv3)](https://github.com/nmrugg/stockfish.js/tree/v17.1.0)
och [chess.js 1.4.0 (BSD-2-Clause)](https://github.com/jhlywa/chess.js/tree/v1.4.0)
levereras med sina licenser i `vendor/`.

Brädet använder [Lichess Brown](https://github.com/lichess-org/lila/blob/master/public/images/board/brown.png)
(AGPLv3+) och [Maestro-pjäserna](https://github.com/lichess-org/lila/tree/master/public/piece/maestro)
av sadsnake1 (CC BY-NC-SA 4.0). Licenserna finns i `vendor/`.
