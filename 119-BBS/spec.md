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

Parameterar till url:

|Namn|värde|betydelse|
|-|-|-|
|n|8|gruppstorlek|
|filter|1|AVPRICKAD|
|filter|2|BETALT|
|filter|3|BETALT och AVPRICKAD|
|filter|saknas|alla|

https://member.schack.se/ShowTournamentServlet?id=16696&hideclasses=true&n=8&filter=1

### Grupper
* Sortera deltagarna på [fallande elo, stigande SSF-ID]
* Gruppera dem med gruppstorleken n
* Grupperna ska benämnas A, B, C osv
* Sista två grupperna slås ihop. Detta blir en Schweizergrupp. Övriga blir Berger
* Skriv ut grupperna med följande kolumner: Nr, SSF-ID, Namn, Elo
* Före Bordslistorna ska en sidbrytning placeras

### Bordslista Bergergrupp:
* Bergergrupperna skapas genom att första deltagaren möter sista, andra möter näst sista, osv
* Första halvan har vit färg. Sista halvan har svart.

### Bordslista Schweizergrupp:
* Om antalet är udda, lägg till en frirond
* Sortera deltagarna i gruppen enligt [fallande elo, stigande SSF-ID]
* Dela därefter in deltagarna i två lika hälfter. Den första har högre elotal
* De två ettorna möter varandra, osv
* Udda bord färgväxlas

* Skriv ut det övergripande turneringsnamnet
* (Berger) behöver inte skrivas ut
* Visa Bordslistor för alla grupper
* Deltagarnas namn ska skrivas ut, inte klubbnamnen
* Använd <table> för tabellerna
* Centrera kolumnerna Bord, Elo och Resultat


Rubrik:
Bord Vit              Elo  Resultat Elo  Svart
   1 Christer Nilsson 1668     -    1668 Mikael Ekbom

Sidbrytning vid utskrift ska om möjligt undvikas inuti en grupp.

