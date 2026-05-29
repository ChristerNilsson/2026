Indatasidan har lästs in av webläsaren

Programmet ska ligga i en fil sketch.js

Denna fil ska användas av bokmärket.

Jag behöver få ut en matris för en tasaselo-turnering.

UTF-8 ska gälla.

### Indata:

En url: https://www.shakki.net/tasaselo/ty550629.txt
Varje deltagare möter ett antal motspelare.  

### Utdata:

Visa enbart matrisen i webläsaren.  
Till höger om matrisen ska spelarnas namn skrivas ut.  
Rondnummer anges med 123456789abcdefghijklmnopqrstuvwxyz osv.  

En matris med N deltagare på båda axlarna
Matrisen är symmetrisk kring huvuddiagonalen och innehåller N x N celler.

* X-axel: fallande elotal
* Y-axel: fallande elotal
* Cell: rondnummer för ett möte mellan två deltagare. Alla övriga har tecknet ".". Huvuddiagonalen ska innehålla "•".

         1 2 3 4 5 6 7 8 9 0 1 2 3 osv
 1 2341  * 1 •                     Adam 
 2 2300  1 * 2                     Bertil
 3 2250  • 2 *                     Cesar
osv

Under matrisen vill jag ha följande url, uppdaterad med korrekta namn och elotal.
Även parametern ROUNDS ska ha rätt värde. Övriga parameterar är ok.

https://christernilsson.github.io/2025/035-FairPair/?TITLE=&CITY=&FED=SWE&ARB=&GAMES=1&ROUNDS=8&currSort=%23&currRound=0&ONE=1&A=1&B=1&C=1&SPEED=0&p=1753|Veine+Gustavsson|1786911&p=1977|Tomas+Lindblad|1786911&p=1842|Sven-%C3%85ke+Karlsson|1786911&p=1899|Susanna+Berg+Laachiri|1786911&p=1729|Sten+Hellman|1786911&p=1977|Stefan+Engstr%C3%B6m|1786911&p=1915|Rune+Evertsson|1786911&p=1930|Rado+Jovic|1786911&p=1894|Peter+Silins|1786911&p=1824|Ove+Hartzell|1786911&p=1896|Olle+%C3%85lgars|1786911&p=1600|Mikael+Lundberg|1786911&p=1724|Magnus+Karlsson|1786911&p=1695|Leonid+Stolov|1786911&p=1949|Lennart+B+Johansson|1786911&p=1865|Leif+Lundquist|1786911&p=1785|Lars+Ring|1786911&p=1752|Lars+Cederfeldt|1786911&p=1848|Lars-%C3%85ke+Pettersson|1786911&p=1588|Lars-Ivar+Juntti|1786911&p=1913|Kjell+H%C3%A4ggvik|1786911&p=1660|Kent+Sahlin|1786911&p=1531|Jouko+Liistamo|1786911&p=1791|Johan+Sterner|1786911&p=2010|Henrik+Str%C3%B6mb%C3%A4ck|1786911&p=1540|Helge+Bergstr%C3%B6m|1786911&p=1798|Hans+Westr%C3%B6m|1786911&p=2092|Gunnar+Hedin|1786911&p=1670|Friedemann+Stumpf|1786911&p=1821|Dick+Viklund|1786911&p=1694|Christer+Nilsson|1786911&p=1729|Christer+Johansson|1786911&p=1947|Bo+L%C3%A4ndin|1786911&p=1806|Bo+Franz%C3%A9n|1786911&p=1820|Bj%C3%B6rn+L%C3%B6wgren|1786911&p=2062|Axel+Ornstein|1786911&p=1539|Arne+Jansson|1786911&p=1932|Andrzej+Kami%C5%84ski|1786911&p=1500|Ali+Ko%C3%A7|1786911&p=1688|Abbas+Razavi|1786911

