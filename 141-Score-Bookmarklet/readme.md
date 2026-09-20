https://member.schack.se/ShowTournamentServlet?id=19069

## Prediktera ospelade ronder

Lägg innehållet i `prediction-bookmarklet.txt` i ett separat bokmärke och öppna
ställningslistan med spelare i rader och ronder i kolumner (till exempel
`ShowTournamentServlet?id=19143&listingtype=2`). Bokmärket använder motståndarnumren
i rondcellerna, beräknar förväntad poäng från spelarnas rating och fyller endast ospelade
rondceller utan att ta bort motståndarnumren. Dessa värden visas kursivt. En ny kolumn, **PRED POÄNG**, visar
aktuell poäng plus summan av de predikterade rondcellerna.
Kolumnen **PR*** använder resultatet mot varje motståndare med känd rating,
inklusive de predikterade resultaten. Ratingtalet löses iterativt ur summan av
Elo-formelns förväntade poäng mot just dessa motståndare. Frirond och walkover
utan ratad motståndare räknas inte. Vid noll eller full poäng finns ingen ändlig
lösning; då visas `–`. Den tidigare **KV.P**-kolumnen visas som **DIFF** och
innehåller **PR* minus spelarens rating** (positivt värde betyder högre
predikterad performance än aktuell rating).

Vid 100 poängs Elo-skillnad ger Elo-formeln ungefär 0,64 poäng till den högre
rankade och 0,36 till den lägre. Partier utan känd rating eller lottning lämnas
orörda. Klicka igen för att räkna om; inga extra kolumner läggs till.
Om du har sparat en äldre version av bokmärket, byt dess URL till den aktuella
texten i `prediction-bookmarklet.txt`. Den lägger till ett tidsvärde i skriptadressen
så att webbläsaren hämtar den publicerade senaste versionen.

## Visa spelarnas score i bordslistan

Lägg innehållet i bookmarklet.txt i ett bokmärke

Bookmarkleten kopierar aktuell poäng från resultatlistan till egna POÄNG-kolumner
efter vit respektive svart spelares namn i bordslistan. Spelarna matchas med ID.
W.O. får ingen poäng. Upprepade klick uppdaterar poängen utan dubbletter.
Ändringen visas bara i din webbläsare. Kör bokmärket igen efter omladdning eller rondbyte.

Samma bokmärke lägger till **FIDE-ID** efter namnet i ställningslistan, även när
ingen bordslista visas. Id hämtas från spelarens resultatsida och länkar till
FIDE-profilen. Under hämtningen visas `…`; spelare utan FIDE-id får en tom cell.
Misslyckade hämtningar visas med `?` och kan försökas igen genom ett nytt klick.
Upprepade klick ger inga dubbla kolumner och återanvänder redan hämtade id.

## Alfabetisk namnlista med bord och färg

Lägg innehållet i `names-bookmarklet.txt` i ett separat bokmärkes URL.
Öppna turneringens bordslista för önskad rond och klicka på bokmärket.

En vy som fyller webbläsarfönstret visar **Namn**, **Bord** och **Färg** (Vit eller Svart).
Listan delas automatiskt i flera spalter och textstorleken anpassas så att alla
spelare syns utan skrollning. Varje spalt har egna rubriker. Läs uppifrån och ned,
sedan vidare till nästa spalt åt höger. Layouten anpassas när fönstret ändrar storlek.
Använd gärna webbläsarens helskärmsläge (F11) på den stora skärmen.
Listan sorteras alfabetiskt på hela det visade namnet, alltså förnamnet först,
med svensk sortering (Å, Ä, Ö). W.O. tas inte med som spelare.
Stäng rutan med **Stäng** eller Escape. Fungerar även efter score-bookmarkleten.

Källkoden finns i `names.js`.

## Namn och Elo som textfil

Använd `elos-bookmarklet.txt` på turneringens deltagarlista eller ställningslista.
`elos.js` öppnar en textfil i en ny flik med **Elo** och **Namn**, separerade med
ett mellanslag, en spelare per rad i sidans ordning. Om nya flikar blockeras laddas filen
ned i stället. Svenska tecken bevaras med UTF-8.

Värdena hämtas från kolumnen ELO, eller RANKING om ELO saknas. Eventuella
bokstavssuffix tas bort, exempelvis blir `1881S` till `1881`. Det är sidans
visade rating som exporteras; RANKING kan avse snabb- eller annan rating.
Spelare utan rating får ett tomt Elo-fält. W.O. tas inte med.

## Berger table för alla ronder

Lägg innehållet i `berger-table-bookmarklet.txt` i ett bokmärke och kör det på
en turneringssida som visar rondlänkar, exempelvis `ShowTournamentServlet?id=19387`.
`berger-table.js` hämtar varje rond och öppnar en textfil med turnering, grupp
och en lottningstabell per rond. Kolumnerna är **Bord, Vit, Elo, Resultat, Elo,
Svart**, med rondnummer efter Svart och gruppbokstav före varje bordsnummer.
Bord och Resultat centreras. Ratingens bokstavssuffix tas bort; ospelade partier visas med `-`.
Om webbläsaren blockerar den nya fliken laddas textfilen ned i stället.

`.txt`-filerna är små laddare som hämtar respektive JS-fil från GitHub Pages.
Vid ändringar uppdateras JS-filen; generera inte in hela källkoden i `.txt`-filerna.
När JS-filen publicerats används ändringen via det befintliga bokmärket.
