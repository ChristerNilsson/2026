# Rondmatris-bokmärke

Det här projektet innehåller kod för ett bokmärke som läser resultatvyn på
`member.schack.se` och visar en symmetrisk rondmatris i webbläsaren.

## Användning

1. Öppna en turnering på `member.schack.se`, till exempel:
   `https://member.schack.se/ShowTournamentServlet?id=16547&listingtype=2`
2. Skapa ett nytt bokmärke i webbläsaren.
3. Publicera `sketch.js` i GitHub-repot.
4. Klistra in innehållet från `bookmarklet.txt` som bokmärkets URL.
5. Klicka på bokmärket när turneringssidan är öppen.
6. Enbart matrisen visas ovanpå turneringssidan.

Bookmarklet-filen är bara en loader:

```js
javascript:(()=>{const s=document.createElement('script');s.src='https://christernilsson.github.io/2026/118-Matrix-MS/sketch.js';document.head.appendChild(s)})()
```

Webbläsaren kan inte importera `sketch.js` direkt från den lokala arbetskatalogen
när du är inne på en HTTPS-sida. Scriptet måste vara tillgängligt via URL.

Matrisen sorteras efter fallande ranking/Elo på båda axlarna. Diagonalen visas
med `*`, ospelade/ej parade celler med `•`, och möten visas med rondnummer.
