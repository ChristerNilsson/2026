Jag behöver kod till ett bokmärke.

* bookmarklet.txt
* sketch.js
* index.html

Använd UTF-8 i alla filer.

### Input

https://s2.chess-results.com/tnr1301930.aspx?lan=1&art=0&flag=30&SNode=S0

Enbart en av två tabeller ska visas.

Ställning: https://s3.chess-results.com/tnr1301930.aspx?lan=1&art=1&rd=9&turdet=YES&flag=30&SNode=S0
Bordslista: https://s3.chess-results.com/tnr1301930.aspx?lan=1&art=2&rd=9&turdet=YES&flag=30&SNode=S0

Vald tabell kan visas som en eller flera kolumner.

Om en tabell visas som flera kolumner, ska kolumnrubrikerna synas för alla kolumner.

(Denna bookmarklet kan användas istället för att använda skärmen i porträtt-läget)

Om en tabell innehåller 100 rader ska den kunna visas som 50+50, 33+33+34, 25+25+25+25 osv

Försök ha så lika antal rader i varje kolumn som möjligt. T ex är 48+48+48+50 inte ok.

Behåll tabellernas utseende så långt möjligt.

Gör inte tabellerna bredare. Centrera istället.

Undvik att tabellraderna glesas ut på höjden.

Skippa följande kolumner för Ställning.
* sex 
* FED
* Typ
* SNo
* Rp
* n
* w
* we
* w-we
* K
* TB3
* TB2
* TB1

Då flera tomma kolumner i bredd förekommer, byt dem mot en enda.

Gör tomma kolumner fem pixlar breda.

Kom ihåg antalet valda kolumner per tabell.

Skapa en readme.md som riktar sig till den som ska installera denna bookmarklet och även använda den.

### Kommandon

Välj tabell med tangenterna Up och Down.

Välj antal kolumner med tangentera Left och Right.

Piltangenterna ska visas som pilar, inte som text.
