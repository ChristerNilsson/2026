# 119-BBS Gruppgenerator

Detta repo innehåller ett bookmarklet för schackturneringar samt en lokal testvy.

1. Bookmarklet-läge: körs på turneringssidan (t.ex. `member.schack.se`) för att hämta tabellen med deltagare och skapa en länk till `121-Lotta-Skriv`.
2. Testvy: öppna `index.html` lokalt med URL-parametrar för att kontrollera grupperna.

Filer
- `index.html` – enkel vy för att visa grupper.
- `sketch.js` – JavaScript som kan köras både som bookmarklet och i vyn.
- `bookmarklet.txt` – bookmarklet-kod som du kan dra till bokmärkesfältet.

Användning
- Bookmarklet: besök turneringssidan och klicka bookmarkleten. Välj `n` med tangenterna `+` och `-`, och klicka sedan på länken till `https://christernilsson.github.io/2026/121-Lotta-Skriv/`.
- Testvy: öppna `index.html` lokalt och ange parametern `players` i formatet:
  `?turnering=Växjöspelen&n=8&players=1984 Adam Nilsson|1954 Bertil Svensson|...`

Parametrar
- `turnering` – turneringens namn.
- `n` – gruppstorlek (tillåtet: 4,6,8,10,12,14,16).
- `players` – pipe-separerad lista: `Ranking Namn`.
- Ranking nollutfylls till minst fyra siffror, till exempel `0000`.
- Om antalet spelare inte är jämnt delbart med `n` skickas inte de sista `d modulo n` spelarna vidare. De tillhör Schweizergruppen, som hanteras separat.

Exempel
`index.html?turnering=Växjöspelen&n=4&players=1984 Adam Nilsson|0000 Helge Ågren`

Bookmarklet
Innehåll i `bookmarklet.txt` kan klistras som ett bokmärke. Den laddar `sketch.js` från GitHub Pages.

License: personlig/ej specificerad
