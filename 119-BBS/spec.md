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

https://member.schack.se/ShowTournamentServlet?id=16696&hideclasses=true&gruppstorlek=6

### Utdata:

* Sortera deltagarna på elo.
* Gruppera dem med gruppstorlek.
* Sista två grupperna slås ihop. Detta blir en Schweizergrupp. Övriga blir Berger.
* Varje grupp randomiseras.
* Bergergrupperna låter ettan möte tvåan osv.
* Schweizergruppen kan ha udda antal. I så fall ska den med lägst elo få en frirond.
* Schweizergruppen låter ettan möte tvåan osv.
* Visa Bordslistor för alla grupper

Rubrik:
Bord Vit              Elo  Resultat Elo  Svart
   1 Christer Nilsson 1668     -    1678 Mikael Ekbom 
