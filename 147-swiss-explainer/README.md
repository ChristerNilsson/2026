# Swiss

Svensk interaktiv förklaring av schweizerlottning. Kör `npm start` och öppna http://localhost:3000. Inga installerade beroenden behövs. `npm run check` kontrollerar JavaScript-syntax.

Sidan läser nu verkliga data för Stockholmsmästerskap Veteran 60+ 2026 från `public/tournament-19069.json`, extraherade ur användarens `19069.html`. Kör `node extract-tournament.cjs` efter att HTML-filen uppdaterats. Extraktionen kontrollerar ömsesidiga motståndare, färger, resultat och poängsummor för samtliga 54 spelare. Frironder markerade `b` tolkas som ½ poäng; denna tolkning stämmer med publicerade poängsummor. Poängkolumnen innehåller även registrerade half-byes för rond 5 och används därför inte direkt som poäng inför rond 5.

De fyra tidigare partierna utan resultat är uppskjutna enligt användaren. De räknas temporärt som ½ poäng per spelare för lottningen. Det är inte ett slutresultat; färger i ännu ospelade partier räknas inte som spelade färger. Publicerade möten för rond 5 visas i sista steget. Tabellnummer är inte TPN; ordningen uppskattas med rating. Spelare utan numerisk motståndare i vald rond undantas från mötesgrupperna.

Automatisk hämtning av schack.se och en fullständig Dutch-lottningsmotor ingår inte. Appen beräknar poäng, grupper, uppskattad sortering och färgpreferenser samt förklarar kandidatkontroller. Regelreferens: https://handbook.fide.com/chapter/C0403202602 (från 2026-02-01). Historiska turneringar måste analyseras med då gällande regler.

## Import

I steg 6 öppnar knappen Kandidater (eller C17 · analys) en lista över alla aktiva spelare i motståndarens poänggrupp. Man kan växla sida i mötet. Kontrollerna omfattar tidigare möten (C1), absoluta färgkonflikter (C3), lokala färgkostnader (C12/C13) och uppflyt för motståndare till nedflyttade spelare (C15/C17). Kriteriereferenser anger underbyggda lokala jämförelser, inte verifierade beslut från lottningsprogrammet. Likvärdiga kandidater märks som möjliga, inte som förkastade. Övriga spelare redovisas separat med annan poänggrupp eller frånvaro i ronden. `npm test` kontrollerar denna analys och öppning av kandidatvyn för alla publicerade möten i rond 2–5.

Välj Importera JSON. Filen innehåller `players`, där varje spelare har unikt `id` (verkligt TPN), `name`, `rating`, valfritt `active: false` och `history` med en post per tidigare rond. `score` är poängen som användes vid nästa lottning, `played` anger om partiet faktiskt spelats, `color` är W eller B för spelade partier och `opponent` är motståndarens TPN. Ospelade ronder ska också ha en historikpost. Aktivitetsflaggan avser ronden som ska analyseras och måste anpassas för andra ronder. Importen gör formatkontroller men verifierar inte en fullständig officiell resultatlista.

```json
{"players":[{"id":1,"name":"Spelare A","rating":1800,"history":[{"opponent":2,"color":"W","score":1,"played":true}]},{"id":2,"name":"Spelare B","rating":1700,"history":[{"opponent":1,"color":"B","score":0,"played":true}]}]}
```

Vid uppskjutna partier behövs arrangörens lottningsresultat och status vid aktuell lottningstidpunkt. Den här förenklade filmodellen ersätter inte officiell lottningslogg, flythistorik eller lokala tävlingsbestämmelser.
