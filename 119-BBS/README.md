# 119-BBS Gruppgenerator

Detta repo innehåller en enkel gruppgenerator för schackturneringar. Verktyget finns i två lägen:

1. Bookmarklet-läge: körs på turneringssidan (t.ex. `member.schack.se`) för att hämta tabellen med deltagare.
2. Viewer-läge: öppna `index.html` (eller GitHub Pages) med URL-parametrar för att visa grupper.

Filer
- `index.html` – enkel vy för att visa grupper.
- `sketch.js` – JavaScript som kan köras både som bookmarklet och i vyn.
- `bookmarklet.txt` – bookmarklet-kod som du kan dra till bokmärkesfältet.

Användning
- Bookmarklet: besök turneringssidan och klicka bookmarkleten. Den öppnar verktyget med samtliga spelare i tabellens befintliga ordning.
- Direkt: öppna `index.html` lokalt eller via Pages och ange parametern `players` i formatet:
  `?turnering=Växjöspelen&n=8&players=1984 Adam Nilsson|1954 Bertil Svensson|...`

Parametrar
- `turnering` – turneringens namn.
- `n` – gruppstorlek (tillåtet: 4,6,8,10,12,14,16).
- `players` – pipe-separerad lista: `Ranking Namn`.

Exempel
`index.html?turnering=Växjöspelen&n=4&players=1984 Adam Nilsson|1954 Bertil Svensson`

Bookmarklet
Innehåll i `bookmarklet.txt` kan klistras som ett bokmärke. Den laddar `sketch.js` från GitHub Pages.

License: personlig/ej specificerad
