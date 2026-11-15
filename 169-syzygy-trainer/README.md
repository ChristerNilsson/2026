# Syzygy Trainer

Lokalt träningsprogram i HTML, CSS och JavaScript. Starta med `npm start`
och öppna **http://localhost:8080**. Node.js 20+ behövs för utvecklingsservern.
Schackbiblioteket finns med i `vendor/`; installation behövs inte för att köra.

Spela den vinnande sidan i startpositionen. Klicka på en pjäs och
sedan en markerad målruta. Datorn svarar med tablebase-drag. Vid promovering
väljer du pjäs i en dialog. Vänd brädet med knappen ovanför det.

Välj ett startproblem från `problems.json` i **Välj problem**. Tillgängliga val:

- **KQK:** kung och dam mot kung.
- **KRK:** kung och torn mot kung.

Delproblemen laddas från cachade problemfiler när dessa matchar startpositionen.
Saknas cache genereras en variant i webbläsaren.
Träningen börjar med matt i ett drag. Under **Välj delproblem** kan du välja
mattavstånd direkt eller använda Back/Repeat/Next.
Positioner ska vara giltiga, ej avslutade, vunna för någon av sidorna och
omfattas av tjänstens tablebases (högst sju pjäser, utan rockadrättigheter).

- **Back:** gå tillbaka till ett enklare delproblem.
- **Repeat:** starta om aktuell position.
- **Next:** gå vidare till ett svårare delproblem.

När det sista delproblemet är avslutat är Next fortfarande tänd och
öppnar det lättaste delproblemet i nästa slutspel. Efter sista slutspelet
fortsätter du från första i listan. Knappens hjälptext visar vilket
problem som kommer härnäst.

”Dina drag” räknar spelarens egna drag, inte datorns. ”Minst till matt”
avser startpositionens antal drag mot optimalt försvar, beräknat från DTM
(halvdrag) som `ceil(abs(DTM) / 2)`. För KQK/KRK/KBBK/KBNK används även exakt
`precise_dtz`: på en vunnen linje är nästa nollställande händelse matt.
Generellt DTZ är **inte** mattavstånd; när exakt värde saknas visas ett streck.
Datorn använder tjänstens ordning för bästa utfall och förlänger matt med
DTM när samtliga förlorande svar har DTM. Annars används tjänstens bästa
drag enligt dess DTZ-baserade ordning. Därmed garanteras inte längsta
mattförsvar i andra materialkombinationer utan DTM.

Internet krävs för nya anrop till [Lichess tablebase-API](https://github.com/lichess-org/lila-tablebase#http-api).
Positioner som saknar cachad analys skickas dit. Nätverksfel kan provas igen utan
att partiet förloras. Inga konton eller API-nycklar behövs.

Kör `npm test` för att kontrollera filformat, svårighetsriktning,
mattavstånd och datorns dragprioritering.

## Generera delproblem i webbläsaren

`problems.json` är ett objekt med problemnamn som nycklar och den svåraste
startpositionens FEN som värde. Lägg till fler poster för fler val; listan
i gränssnittet hämtas från filen. Första valet laddas när sidan öppnas.
När en ny variant genereras hämtar JavaScript i webbläsaren tablebase-värden
och spelar en optimal variant till matt: vinnaren minimerar mattavståndet,
försvararen maximerar det. Bland likvärdiga drag slumpas valet för båda sidor.
Detta ger en följd av delproblem, inte alla förgreningar av spelträdet.

Varje position före vinnarens drag sparas, fram till matt i ett. Om försvararen står vid draget i startpositionen spelas först ett optimalt försvarsdrag.
När exakt mattavstånd finns genom hela varianten kontrollerar generatorn att det minskar ett steg mellan problemen.
Den färdiga listan hålls i minnet och läses in för träning, med matt i ett först.
Separata JSON-filer med delproblem minskar antalet anrop. **Skapa en ny variant**
slumpar en ny följd bland likvärdiga optimala drag och kan användas för att
försöka igen vid nätverksfel. Ett problembyte avbryter föregående generering;
gamla resultat kan inte ersätta det nya valet. Vid fel används ingen ofullständig lista.

Schackregler: [chess.js](https://github.com/jhlywa/chess.js), BSD-2-Clause,
licens i `vendor/chess.LICENSE`.

Pjäser: Lichess **cburnett**, Colin M. L. Burnett, GPL-2.0-or-later.
SVG-original från https://github.com/lichess-org/lila/tree/master/public/piece/cburnett.
Licens i `assets/pieces/cburnett/LICENSE.txt`. Brädet använder klassiska
Lichess-färger: ljus beige och brunt.

Använd tid räknas från att delproblemet är spelklart tills partiet slutar, inklusive datorns svarstid. Tiden nollställs vid Back, Repeat, Next och problembyte.

Om tablebase anger vinst men saknar exakt mattavstånd följer generatorn
API:ets DTZ-baserade dragordning till matt. Detta fungerar även genom
bondedrag, slag och promoveringar. Varje position före vinnarens drag blir
ett delproblem, numrerat bakifrån så att 1 alltid är matt i ett drag.
Dragantal längs DTZ-varianten är inte garanterat kortaste vägen till matt.
Där exakt mattavstånd saknas visas minsta antal drag som ett streck och
delproblemets etikett anger i stället antal egna drag till matt i varianten.
Om försvararen står vid draget spelas först ett tablebase-svar.

## Cachade problemfiler

Färdiga varianter med tablebase-svar finns i `problem-cache/`, exempelvis
`problem-cache/krk.json`. Filen innehåller startposition, delproblem,
skapandetid och antal tablebase-anrop (inklusive eventuella återförsök).
En cache används bara om startpositionen fortfarande matchar `problems.json`.
Att läsa en cache kräver inga tablebase-anrop. Drag utanför den cachade
varianten kan fortfarande kräva internet.

Skapa saknade eller uppdatera inaktuella filer med `npm run cache`.
För ett enskilt slutspel: `npm run cache -- KRK`. Giltiga filer återanvänds;
ta bort den aktuella cachefilen för att generera om den. Skriptet gör anrop
i följd och väntar vid HTTP 429. Räknaren i appen visar både anrop under
hela den aktuella sidvisningen och anrop när den valda varianten skapades.
Lokala filhämtningar och träffar i minnescachen räknas inte som tablebase-anrop.

**Skapa en ny variant** genererar i webbläsaren och sparar resultatet lokalt
i webbläsaren. Denna variant används före filcachen när startpositionen matchar.
Filerna på disk skrivs av `npm run cache`.

Cachefilerna skrivs kompakt utan indrag. Bara analysfält som används av
träningen sparas, tillsammans med likvärdiga bästa drag, datorns valda
svar och de avståndsuppgifter som behövs för korrekt bedömning.
`npm run cache` komprimerar även befintliga giltiga filer utan API-anrop.

I KPK (kung och en bonde mot kung) är målet att promovera, för både vit
och svart. Alla val av promoveringspjäs räknas som framgång. Generatorn
och träningen slutar direkt vid promoveringen; ingen efterföljande matt
krävs. Delproblem 1 ligger ett drag före promovering. Äldre KPK-cacher
som fortsätter till matt ersätts när cachen genereras på nytt.

I KQKR (kung och dam mot kung och torn) räcker det att slå motståndarens
torn eller sätta matt. Både generatorn och träningen slutar vid det första
av dessa mål. Delproblem 1 kräver ett drag till tornslag eller matt.
Äldre KQKR-cacher som fortsätter efter tornslaget ersätts vid ny generering.

I bondeslutspel med flera bönder (exempelvis KPPPKPP) är en nettovinst av
en bonde ett delmål under ett fortsatt parti. Bondevinsten bekräftas efter
datorns svar, med bibehållen tablebase-vinst. Ett vanligt bondedrag och ett
jämnt bondebyte räknas inte. Varje etapp visar egna drag och använd tid
sedan föregående delmål, samt totaler från delproblemets start. Totaltiden
fortsätter löpa vid bondevinst. Promovering eller matt löser problemet
direkt och stoppar tiden; även remi avslutar försöket. Ingen träning med
den promoverade pjäsen ingår. Delproblem 1 ligger ett drag före promovering
eller matt. Äldre cacher med efterföljande damspel används inte.
Next byter delproblem. Repeat och problembyte nollställer etapphistoriken.
KPK och KQKR behåller sina separata slutmål ovan.

När föregående nivå är avklarad räcker ett korrekt första drag på nästa
nivå. Draget kontrolleras mot tablebase-analysen för startpositionen:
likvärdiga bästa drag godkänns även om de leder till olika ställningar.
Då stoppas tiden och Next markeras direkt, utan att datorn behöver svara.
DTM används när det finns, annars DTZ med samma nollställningstyp som
det bästa draget. Ett långsammare vinnande drag eller ett remidrag får
inte denna genväg. Utan avklarad föregående nivå spelas lösningen vidare;
en exakt redan avklarad fortsättning kan också kännas igen senare.
Repeat kräver ett nytt drag. Avklarade nivåer sparas i webbläsaren och
återställs vid omladdning när samma variant används. En ändrad variant
får egna framsteg och kräver nya lösningar.

Kryssa i **Repetera hela fortsättningen** för att spela alla återstående
drag även när de redan klarats. Avmarkera för att åter använda genvägen
efter ett korrekt första drag. Inställningen sparas i webbläsaren och
raderar inga framsteg. Om en uppgift redan avslutats med genvägen när
repetition slås på startas samma delproblem om för ett fullständigt försök.
Promovering, tornslag och matt räknas fortfarande som slutmål enligt
respektive problem.

**Hint** under brädet visar nästa rekommenderade drag i statusrutan och
markerar frånrutan i gult och tillrutan i blått. Draget utförs av spelaren.
Cachad analys används när den finns; annars görs ett tablebase-anrop som
räknas i anropsräknaren. Markeringen försvinner efter ett drag eller när
ett nytt försök startas. Hint kan användas när det är spelarens tur i en
pågående uppgift.
Tryck på Hint igen för att dölja dragförslaget och markeringarna.

**Visa Syzygy** under brädet öppnar ett separat analysbräde på samma sida;
**Dölj Syzygy** stänger det. Analysen utgår från den aktuella
träningsställningen och följer med när träningsställningen ändras.
Du spelar båda sidor på analysbrädet, via rutorna eller genom att klicka
på ett drag i tabellen. Det går att ångra, gå framåt, vända brädet och
spela det rekommenderade draget. **Från träningen** återställer analysen
till träningsställningen. Analysdragen påverkar inte träningspartiet,
dess framsteg, dragantal eller resultat. Träningens klocka fortsätter som
vanligt när analysen är öppen.

Analysen visar både DTZ och DTM i halvdrag. Tecknen räknas konsekvent ur
vits perspektiv: plus för vit, minus för svart. Tabellen visar värdena
efter respektive drag med samma perspektiv. DTZ kan vara avrundat (≈),
och DTM visas som — om tjänsten saknar det. DTZ används aldrig som ett
påhittat DTM-värde. Rekommendationen följer Syzygys bästa utfall och
DTZ-ordning, vilket inte alltid innebär kortaste vägen till matt.

Analysvyn hämtar fullständiga tablebase-svar så att även drag som inte
finns i den kompakta träningscachen kan jämföras. Svaren återanvänds i
minnet och nya anrop ingår i den vanliga anropsräknaren. Vid nätverksfel
kan analysen provas igen utan att träningspartiet påverkas.
