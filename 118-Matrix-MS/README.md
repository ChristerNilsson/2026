# Rondmatris-bokmarke

Det har projektet innehaller kod for ett bokmarke som korslaser resultatvyn pa
`member.schack.se` och sparar en symmetrisk rondmatris som `matrix.txt`.

## Anvandning

1. Oppna en turnering pa `member.schack.se`, till exempel:
   `https://member.schack.se/ShowTournamentServlet?id=16547&listingtype=2`
2. Skapa ett nytt bokmarke i webblasaren.
3. Publicera `matrix-bookmarklet.js` pa en webbadress.
4. Uppdatera `SCRIPT_URL` i `bookmarklet.txt` till den adressen.
5. Klistra in innehallet fran `bookmarklet.txt` som bokmarkets URL.
6. Klicka pa bokmarket nar turneringssidan ar oppen.
7. Webblasaren laddar ner filen `matrix.txt`.

Bookmarklet-filen ar bara en loader. Webblasaren kan inte importera
`matrix-bookmarklet.js` direkt fran den lokala arbetskatalogen nar du ar inne pa
en HTTPS-sida, utan scriptet maste vara tillgangligt via en URL.

Matrisen sorteras efter fallande ranking/Elo pa bada axlarna. Diagonalen visas
med `*`, ospelade/ej parade celler med `\u2022`, och moten visas med rondnummer.
