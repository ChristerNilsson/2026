# Syzygy Trainer

Lokalt träningsprogram i HTML, CSS och JavaScript. Starta med `npm start`
och öppna **http://localhost:8080**. Node.js 20+ behövs för utvecklingsservern.
Schackbiblioteket finns med i `vendor/`; installation behövs inte för att köra.

Spela sidan som står vid draget i startpositionen. Klicka på en pjäs och
sedan en markerad målruta. Datorn svarar med tablebase-drag. Vid promovering
väljer du pjäs i en dialog. Vänd brädet med knappen ovanför det.

Välj ett startproblem från `problems.json` i **Välj problem**. Tillgängliga val:

- **KQK:** kung och dam mot kung.
- **KRK:** kung och torn mot kung.

Alla delproblem längs en optimal variant genereras internt i webbläsaren.
Träningen börjar med matt i ett drag. Under **Välj delproblem** kan du välja
mattavstånd direkt eller använda Easier/Same/Harder.
Positioner ska vara giltiga, ej avslutade, vunna för sidan vid draget och
omfattas av tjänstens tablebases (högst sju pjäser, utan rockadrättigheter).

- **Easier (−1):** nästa position i listan.
- **Same (0):** starta om aktuell position.
- **Harder (+1):** föregående position i listan.

”Dina drag” räknar spelarens egna drag, inte datorns. ”Minst till matt”
avser startpositionens antal drag mot optimalt försvar, beräknat från DTM
(halvdrag) som `ceil(abs(DTM) / 2)`. För KQK/KRK används även exakt
`precise_dtz`: på en vunnen linje är nästa nollställande händelse matt.
Generellt DTZ är **inte** mattavstånd; när exakt värde saknas visas ett streck.
Datorn använder tjänstens ordning för bästa utfall och förlänger matt med
DTM när samtliga förlorande svar har DTM. Annars används tjänstens bästa
drag enligt dess DTZ-baserade ordning. Därmed garanteras inte längsta
mattförsvar i andra materialkombinationer utan DTM.

Internet krävs för [Lichess tablebase-API](https://github.com/lichess-org/lila-tablebase#http-api).
Varje position skickas dit för analys. Nätverksfel kan provas igen utan
att partiet förloras. Inga konton eller API-nycklar behövs.

Kör `npm test` för att kontrollera filformat, svårighetsriktning,
mattavstånd och datorns dragprioritering.

## Generera delproblem i webbläsaren

`problems.json` är ett objekt med problemnamn som nycklar och den svåraste
startpositionens FEN som värde. Lägg till fler poster för fler val; listan
i gränssnittet hämtas från filen. Första valet genereras när sidan öppnas.
När du byter problem hämtar JavaScript i webbläsaren tablebase-värden
och spelar en optimal variant till matt: vinnaren minimerar mattavståndet,
försvararen maximerar det. Bland likvärdiga drag slumpas valet för båda sidor.
Detta ger en följd av delproblem, inte alla förgreningar av spelträdet.

Varje position före vinnarens drag sparas, från startpositionen till matt i ett.
Generatorn kontrollerar att mattavståndet minskar ett steg mellan problemen.
Den färdiga listan hålls i minnet och läses in för träning, med matt i ett först.
Inga separata JSON-filer med delproblem behövs. **Skapa en ny variant**
slumpar en ny följd bland likvärdiga optimala drag och kan användas för att
försöka igen vid nätverksfel. Ett problembyte avbryter föregående generering;
gamla resultat kan inte ersätta det nya valet. Vid fel används ingen ofullständig lista.

Schackregler: [chess.js](https://github.com/jhlywa/chess.js), BSD-2-Clause,
licens i `vendor/chess.LICENSE`.

Pjäser: Lichess **cburnett**, Colin M. L. Burnett, GPL-2.0-or-later.
SVG-original från https://github.com/lichess-org/lila/tree/master/public/piece/cburnett.
Licens i `assets/pieces/cburnett/LICENSE.txt`. Brädet använder klassiska
Lichess-färger: ljus beige och brunt.
