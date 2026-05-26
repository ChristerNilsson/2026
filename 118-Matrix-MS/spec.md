Jag behöver kod till ett bokmärke.

Koden i bokmärket ska se ut så här:
javascript:(()=>{const s=document.createElement('script');s.src='https://christernilsson.github.io/2026/118-Matrix-MS/sketch.js';document.head.appendChild(s)})()

### Indata:

Url till en turnering.  
Varje deltagare möter ett antal motspelare.  

https://member.schack.se/ShowTournamentServlet?id=16547&listingtype=2

### Utdata:

Visa matrisen i webläsaren.

En matris med N deltagare på båda axlarna
Matrisen är symmetrisk kring huvuddiagonalen och innehåller N x N celler.

* X-axel: fallande elotal
* Y-axel: fallande elotal
* Cell: rondnummer för ett möte mellan två deltagare. Alla övriga har tecknet "•". Huvuddiagonalen innehåller asterisker.

         1 2 3 4 5 6 7 8 9 0 1 2 3 osv
 1 2341  * 1 •
 2 2300  1 * 2
 3 2250  • 2 *
osv

