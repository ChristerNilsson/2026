Jag behöver kod till ett bokmärke.

UTF-8 ska gälla.

Skapa följande filer:

* bookmarklet.txt
* sketch.js
* index.html

Koden i bokmärket ska se ut så här:

javascript:(()=>{const s=document.createElement('script');s.src='https://christernilsson.github.io/2026/119-BBS/sketch.js';document.head.appendChild(s)})()

### Indata:

Url till en turnering med alla grupper.  
Varje deltagare möter ett antal motspelare.  
Från indata hämtas Namn, Elo samt SSF-ID, t ex 716556 för Christer Nilsson
Kolumner:
||NAMN|KLUBB|RANKING (datum)|DISTRIKT|BETALT|AVPRICKAD|
|-|-|-|-|-|-|-|
|26|Christer Nilsson|Seniorschack Stockholm|1668|Stockholms SF|JA||

Tangentkommandon:

`+` : Öka gruppstorlek med 2
`-` : Minska gruppstorlek med 2
`A` : Toggla Avprickad
`B` : Toggla Betalt

* Programmet filtrerar på Avprickad och Betalt. Initialt visas alla deltagare. 
* Initial gruppstorlek: 6
* Möjliga gruppstorlekar: 4,6,8,10 eller 12 deltagare

https://member.schack.se/ShowTournamentServlet?id=16696

* Skriv ut turneringens namn, Betalt, Avprickad och gruppstorlekar (t ex 8 + 8 + 8 + 13 = 37) initialt.

### Grupper
* Sortera deltagarna på [fallande elo, stigande SSF-ID]
* Gruppera dem med gruppstorleken n
* Grupperna ska benämnas A, B, C osv
* Sista två grupperna slås ihop. Detta blir en Schweizergrupp. Övriga blir Berger
* Skriv ut grupperna kompakt så här: 
|Grupp|Nr|SSF-ID|Namn|Elo|
|-|-|-|-|-|
|A    | 1|366174|Lars Norqvist|1762|
* Före Bordslistorna ska en sidbrytning placeras

### Bordslista Bergergrupp:
* Bergergrupperna skapas genom att första deltagaren möter sista, andra möter näst sista, osv
* Första halvan har vit färg. Sista halvan har svart.

### Bordslista Schweizergrupp:
* Om antalet deltagare är udda, lägg till en frirondspelare.
* Sortera därefter deltagarna i schweizergruppen enligt [fallande elo, stigande SSF-ID]
* Dela därefter in deltagarna i två lika stora halvor.
* Deltagaren med lägst elo-tal ska frironden om frirond är nödvändigt.
* De två ettorna möter varandra, osv
* Udda bord färgväxlas

* Skriv ut det övergripande turneringsnamnet
* (Berger) behöver inte skrivas ut
* Visa Bordslistor för alla grupper
* Deltagarnas namn ska skrivas ut, inte klubbnamnen
* Använd <table> för tabellerna
* Centrera kolumnerna Bord, Elo och Resultat

|Grupp|Bord|Vit             |Elo |Resultat|Elo |Svart|
|-|-|-|-|-|-|
|  D  |  1 |Christer Nilsson|1668|    -   |1668|Mikael Ekbom|

Sidbrytning vid utskrift ska om möjligt undvikas inuti en grupp.
Det behövs ingen utskrift av gruppnamnet i Bordslistorna.
Skriv inte ut rubrikerna Grupper och Bordslistor. Det kan vara ont om utrymme.
Slå ihop bordslistorna till en tabell.
Skriv även ut turneringens namn före Bordslistan.