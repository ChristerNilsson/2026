Jag vill att du listar ut hur lottningen i Tasaselo går till.

Lotta rond 2.

Gå inte vidare förrän rond 2 lottas på samma sätt som i filen.

Rond 1 behöver ej paras. Tag hänsyn till både resultat och färger i alla dessa partier.

Rond 2 paras enligt den algoritm vi försöker återskapa.

Visa hur du viktar.

Inte bara paren ska stämma, de ska ha korrekta färger också. 

Undvik `v1-m2`, låt första spelaren ange vit, andra svart. Dvs ersätt med `1-2`

* UTF-8
* index.html
* sketch.js

Input:

https://www.shakki.net/tasaselo/ty550629.txt

Följande storheter påverkar parningen och viktas ihop på något sätt
* Poäng
* Grupp
* Eloskillnad
* Färgbalans

Färgbalansen räknas som W minus B.
När färgbalansen räknas för ett par adderas spelarnas färgbalanser. Man eftersträvar färgbalans 0 för paret.
Celler med |färgbalans| > 2 kan ej paras.

Variera vikterna tills rond 2 lottas enligt filen.

Simulera aldrig resultaten.

För varje rond
	* Bilda alla möjliga par.
	* Det innebär att spelare som redan mötts inte ingår.
	* Initiera Blossom med den absoluta skillanden mellan parens värdering

Visa resultatet i form av en matris 42x42 där cellerna innehåller rondnummer.

Jag behöver se båda matriserna. 

Använd blossom.js

Innan du skapar matriserna, sortera på elotalen och numrera om deltagarna.

Visa även dessa elotal på varje rad i matrisen.

Om du inte redan kvadrerar cellinnehållet, gör det nu. Med kvadrering menas elodiff * elodiff i varje cell. I analogi med minsta kvadrat metoden.

Beräkna ett godhetstal för båda matriserna. Till exempel elo-medelavståndet mellan två spelare. Jag vill veta om Blossom är bättre.

Lägg elotalen sist på raden.

Kolumnrubrikerna ska bara visa entalssiffran för att spara plats.

Visa matriserna kompaktare. Jag vill se elotalen utan att scrolla.

