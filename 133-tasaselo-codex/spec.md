Jag vill att du listar ut hur lottningen i Tasaselo går till.

Utgå från spelarnas elotal enbart.

Ignorera de första tre borden i rond 1. Det sker något oregelbundet där, för att undvika för tidigt finalparti.

* UTF-8
* index.html
* sketch.js

Input:

https://www.shakki.net/tasaselo/ty550629.txt

För varje rond
	* Bilda alla möjliga par.
	* Det innebär att spelare som redan mötts inte ingår.
	* Färgväxlingskravet hindra en del möten.
	* Initiera Blossom med den absoluta skillnaden mellan två par i cellerna.

Vi ignorerar poäng och kan därmed räkna ut alla sju ronderna direkt.

Läs lottningen för de tre första borden i rond 1. Detta för att minimera påverkan.

Visa resultatet i form av en matris 42x42 där cellerna innehåller rondnummer.

Jag behöver se båda matriserna. 

Det ser ut som att du använder grupperna. Grupperna ska inte påverka lottningen.

Din variant av Blossom är extremt långsam. Använd blossom.js

Innan du skapar matriserna, sortera på elotalen och numrera om deltagarna.

Visa även dessa elotal på varje rad i matrisen.

Om du inte redan kvadrerar cellinnehållet, gör det nu. Med kvadrering menas elodiff * elodiff i varje cell. I analogi med minsta kvadrat metoden.

Beräkna ett godhetstal för båda matriserna. Till exempel elo-medelavståndet mellan två spelare. Jag vill veta om Blossom är bättre.

Lägg elotalen sist på raden.

Kolumnrubrikerna ska bara visa entalssiffran för att spara plats.

Visa matriserna kompaktare. Jag vill se elotalen utan att scrolla.

