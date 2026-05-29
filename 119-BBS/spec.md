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

https://member.schack.se/ShowTournamentServlet?id=16696&hideclasses=true&n=8

### Instruktioner för att skapa grupper
* Sortera deltagarna på elo.
* Gruppera dem med gruppstorleken n.
* Grupperna ska benämnas A, B, C osv
* Sista två grupperna slås ihop. Detta blir en Schweizergrupp. Övriga blir Berger.
* Skriv ut grupperna

### Bordslista Bergergrupp:
* Bergergrupperna skapas genom att första deltagaren möter sista, andra möter näst sista, osv.  
* Färgväxling sker för vartannat bord.

### Bordslista Schweizergrupp:
* Om antalet är udda, lägg till en frirond.  
* Sortera deltagarna i gruppen enligt fallande elo.
* Dela därefter in deltagarna i två lika hälfter. Den första har högre elotal.
* De två ettorna möter varandra, osv.
* Färgväxling sker för vartannat bord.

* Skriv ut det övergripande turneringsnamnet.
* (Berger) behöver inte skrivas ut.
* Visa Bordslistor för alla grupper
* Deltagarnas namn ska skrivas ut, inte klubbnamnen.
* Använd <table> för tabellerna.
* Centrera kolumnerna Bord, Elo och Resultat

Rubrik:
Bord Vit              Elo  Resultat Elo  Svart
   1 Christer Nilsson 1668     -    1668 Mikael Ekbom

