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
Ovanför visas avvikelsen från telefonens riktning och en markerad vänster- eller
högerpil som hjälper användaren att styra avvikelsen mot noll. Den relativa
vägledningen döljs när telefonen lutar tydligt åt sidan.
