[Try it!](https://christernilsson.github.io/2026/171-5334-anki/index.html)

Syftet med denna html+js app är att träna matt i ett eller flera drag.
Jag har ett antal problem i filen 5334.json

Dessa ska hanteras på ett Anki-liknande sätt. Vid start ligger alla problemen i lista A. De har alla sitt id. När man hämtar ett problem från lista A innebär det att det flyttas till lista B. 

Lyckas man lösa problemet korrekt, alla drag, ökar man på egenskapen Intervall med ett och sätter egenskapen Tid till Now + tider[Intervall]. Varje problem innehåller Fen, Id, Intervall, Tid

Intervall är ett heltal mellan 0 och 5

tider = [10m, 1h, 1d, 1w, 1m, Done]

Misslyckas man, sätts intervall tillbaka till 0 och Tid uppdateras.
Då får man även chansen att med knappen Hint få se en lösning, ett steg i taget.
Trycker man på Hint räknas problemet som Misslyckat.

Förutom Hint finns även knappen Continue. Denna trycker man på när man vill se nästa problem. 
Den aktiveras först när problemets status är klar, dvs Lyckat eller Misslyckat.

De två variablerna A och B sparas på localStorage.

När man startar programmet är uppgifter i Lista B prioriterade. Deras Tid ska vara mindre än Now. 
När alla dessa i Lista B är avklarade, fortsätter man att hämta från lista A, med låga id först.


