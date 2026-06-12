Jag vill skapa ett matematiskt spel.
Man ska lösa uppgiften med minimalt antal kommandon.

* UTF-8
* index.html
* sketch.js

Språket ska vara engelska.

Skriv en bra ReadMe.md som förklarar allt.
Den ska även innehålla en länk till det körbara spelet på github, med namnet "Try it!"

Spelet ska fungera både med tangentbord och touch.

Spelet ska spelas mellan två spelare.

Spelarna spelar samtidigt. Alltså måste minst åtta tangenter vara definierade.
T ex WASD och de fyra piltangenterna. Dessutom ska touch fungera.

Poängen beräknas som tio sekunder per kommando plus betänketiden.

När båda spelarna löst uppgiften ska båda lösningarna visas tillsammans med den kortast möjliga lösningen.

Svårighetsgraden styrs av level.  
Level börjar med ett steg.  
När båda löst uppgiften, oavsett optimal lösning, inkrementeras Level  
Om ingen löst uppgiften dekrementeras level.  
Maximalt tal börjar med 20, För varje ny nivå ökas maximum med 5.  
Maximalt tal styr bara vilka tal som kan var Start och Target.
Mellanresultat kan vara högst sex siffror.

Programmet skapar uppgifterna. Det innebär att input för Start och Target inte behövs. Inte heller knappen Ny Uppgift.  
Knapparna ska innehålla klartext samt vilken knapp som kan användas.
Startvärdet behöver inte visas. Det framgår av varje spelares aktuella värde.
Tickande klocka behöver ej visas.

Färgerna grönt och rött dekorerar spelarna. Låt dessa färger byta plats. Babord och Styrbord.

## Input
* Start
* Target

## Spelsida

* Visa inte antal kommandon.
* Visa inte tiden
* Visa inte vägen
* Visa inte hjälptexten till höger om Spelare 1
* Visa inte texterna Spelare 1 och Spelare 2

### Kommandon
* Half [A, Left]
	* Fungerar bara med jämna tal
* Add 2 [S, Down]
* Double [D, Right]
* Undo [W, Up]
* Ge upp [Esc, Backspace]

Visa kommandonas knappar i en mindre, stiliserad, form till vänster om Undo.
Centrera dessa små kluster.
Tag bort WASD från de fyra tangenterna osv.
Visa tydligt att en spelare nått målet. T ex genom att gråa ut de fyra knapparna.
Visa tydligt att en spelare gett upp. Tag bort panelen med texten "Gett upp".
Till höger om Undo ska man se ett tal som anger hur många kommandon som behövs. Den räknar ner till noll. Den ska inte se ut som en knapp.

```
 W
ASD
```

Visa kommandona i form av ett upp och ner-vänt T.

## Resultatsida

Detta blir en egen sida. Här visas de båda spelarnas vägval samt optimal lösning. När båda är nöjda går man till nästa problem.
Visa de tre lösningarna som tre kolumner med optimal lösning i mitten.
Bryt ner knappen Nästa i två separata knappar. Båda spelarna ska vilja gå vidare.
Alla tre lösningarna ska ha starttalen på samma höjd.
Första delresultatet ska också ha samma höjd. osv.

### Exempel
```
36.6    62.3
3    3    3
6    6    5
8    8    7
         14
         16
          8

```

### Kommandon
* Nästa [Tab, Enter]

## Exempel

Gå från 12 till 13 => 12 24 26 13
