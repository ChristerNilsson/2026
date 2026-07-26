# Kompass

[Try it](https://christernilsson.github.io/2026/135-gpskarta/)

En mobilanpassad webbapp som navigerar mot en WGS84-koordinat med GPS, bäring,
avstånd och röstmeddelanden. Google Maps öppnas med aktuell position och mål.
Min karta öppnas direkt vid målet med SWEREF 99 TM-värden i URL-parametrarna
`n` och `e`.

Koordinatfältet accepterar även en komplett delningslänk från Min karta. Appen
läser länkvärdena `n` och `e`, omvandlar dem från SWEREF 99 TM till WGS84 och
använder resultatet som navigeringsmål.

Appens automatiska vägledning använder de förinspelade MP3-filerna i `sounds`:
manlig röst för bäring och kvinnlig röst för avstånd. På iPhone låses
MP3-spelaren upp när navigeringen startas. Bäringen läses inte upp när mindre än
10 meter återstår. Appen använder inte webbläsarens talsyntes.

När navigeringen startas begär appen även åtkomst till mobilens kompass.
Kompassrosens nål och gradangivelsen visar den absoluta bäringen mot målet.
Ovanför visas avvikelsen från telefonens riktning och en pil som pekar mot målet:
uppåt betyder rakt fram, vänster betyder att användaren ska svänga vänster och
höger betyder att användaren ska svänga höger. Den relativa vägledningen döljs
när telefonen lutar mer än 30 grader framåt, bakåt eller åt sidan. Relativa
riktningar visas från −179° till 180°, där 0° är perfekt kurs och 180° är rakt
från målet.
