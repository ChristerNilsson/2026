# Rondmatris-bokmarke

Det har projektet innehaller kod for ett bokmarke som korslaser resultatvyn pa
`member.schack.se` och visar en symmetrisk rondmatris i webblasaren.

## Anvandning

1. Oppna en turnering pa `member.schack.se`, till exempel:
   `https://member.schack.se/ShowTournamentServlet?id=16547&listingtype=2`
2. Skapa ett nytt bokmarke i webblasaren.
3. Publicera `sketch.js` i GitHub-repot.
4. Klistra in innehallet fran `bookmarklet.txt` som bokmarkets URL.
5. Klicka pa bokmarket nar turneringssidan ar oppen.
6. Matrisen visas ovanpa turneringssidan.

Bookmarklet-filen ar bara en loader:

```js
javascript:(()=>{const s=document.createElement('script');s.src='https://christernilsson.github.io/2026/118-Matrix-MS/sketch.js';s.onerror=()=>alert('Kunde inte ladda '+s.src);document.head.appendChild(s)})()
```

Webblasaren kan inte importera `sketch.js` direkt fran den lokala arbetskatalogen
nar du ar inne pa en HTTPS-sida, utan scriptet maste vara tillgangligt via URL.

Matrisen sorteras efter fallande ranking/Elo pa bada axlarna. Diagonalen visas
med `*`, ospelade/ej parade celler med `\u2022`, och moten visas med rondnummer.
Knappen `Kopiera` kopierar matrisen som ren text.
