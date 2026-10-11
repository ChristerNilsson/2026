# FIDE Dutch engine

Fristående JavaScript-engine extraherad från `fide-dutch.htm` av Mats Winther.
Inget GUI, inga beroenden och ingen lagring. Indata ändras inte.
Samma experimentella lottningsalgoritm som i originalet; ingen FIDE-certifiering.

```js
const { nextPairing } = require('./fide-dutch-engine.js');

const tournament = {
  totalRounds: 5,
  initialColor: 'W',
  players: [
    { id: 'a', name: 'Anna', elo: 2100 },
    { id: 'b', name: 'Bo', elo: 1900 },
    { id: 'c', name: 'Cecilia', elo: 1800 },
    { id: 'd', name: 'David', elo: 1700 }
  ],
  rounds: []
};

const next = nextPairing(tournament);
console.log(next.roundNumber, next.players, next.pairings);

// Registrera resultaten och skicka tillbaka historiken inför nästa lottning.
next.pairings.filter(p => p.kind === 'game').forEach(p => { p.result = '1-0'; });
tournament.players = next.players; // Bevarar de tilldelade lottningsnumren (tpn).
tournament.rounds.push({ roundNumber: next.roundNumber, pairings: next.pairings });
const secondRound = nextPairing(tournament);
```

`nextPairing(tournament, options)` returnerar `{ roundNumber, players, pairings, audit }`.
Spelarnas `score` avser poängen före den nya ronden. Namn och elo finns i
`players`; lottningen refererar till deras id. `audit` innehåller sökstatistik och
lottningskärnans beslutsunderlag.

- Spelar-id måste vara unika, icke-tomma strängar. `name` och heltalsvärdet `elo` (0–9999) krävs. Originalets `rating` accepteras också.
- `tpn` är lottningsnumret. Utan explicit `tpn` rangordnas spelarna efter elo, titel, namn och registreringsordning. Spara returnerade `tpn` för kommande anrop, särskilt om elo eller namn ändras. Om `tpn` anges måste alla spelare ha ett unikt positivt heltal.
- Historiken anges i `rounds`, i kronologisk ordning, med `pairings` och färdiga resultat. Rondnumren börjar på 1. Poäng, motståndare, färger och float-historik räknas om från resultaten vid varje anrop.
- Partier: `{ kind: 'game', board: 1, whiteId: 'a', blackId: 'b', result: '1-0' }`. Tillåtna resultat: `1-0`, `0.5-0.5`, `0-1`, `1-0F`, `0-1F`, `0-0F`. `F` betyder ospelat walkoverparti. Nya partier får `*`, som måste ersättas innan ronden läggs i historiken.
- Frirond: `{ kind: 'pab', pabId: 'a', result: 'AUTO', awardedPoints: 1 }`.
- Frånvaro: `{ kind: 'unplayed', unplayedId: 'a', result: 'AUTO', awardedPoints: 0 }`. En spelare som saknas i en historisk rond räknas som frånvarande med noll poäng, enligt originalet.
- Inför nästa rond kan en spelare ha `active: false`, eller `nextRoundStatus: 'unplayed-zero'`, `'unplayed-draw'` eller `'unplayed-win'`. Standard är aktiv och `'pair'`. Återställ till `'pair'` efter en tillfällig frånvaro.
- Standardinställningar: 5 ronder, initial färg `W`, poäng 1/0.5/0, frirond 1. Alternativet 3/1/0 stöds genom `winPoints`, `drawPoints`, `lossPoints`; `pabPoints` styr frirondspoängen. Använd samma inställningar genom hela turneringen.

Anropet är synkront. Sökgränser anges exempelvis som
`{ limits: { seconds: 30, nodes: 2000000 }, onProgress: info => console.log(info) }`.
Ogiltig indata, avslutad turnering eller omöjlig lottning ger ett undantag.
Överskriden sökgräns ger `error.code === 'LIMIT'`; ingen preliminär lottning returneras.
Acceleration och extra lottningsrestriktioner stöds inte, liksom i originalet.

I webbläsare kan filen laddas med en vanlig script-tagg och API:t nås som
`globalThis.FideDutchEngine.nextPairing(...)`. Node.js använder CommonJS enligt exemplet.

Kör regressionstesterna med `node fide-dutch-engine.test.js`.
