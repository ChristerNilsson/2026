# Kompass

[Try it](https://christernilsson.github.io/2026/135-gpskarta/)

En mobilanpassad webbapp som navigerar mot en WGS84-koordinat med GPS, bäring,
avstånd och röstmeddelanden. Google Maps öppnas med aktuell position och mål.
Min karta öppnas direkt vid målet med SWEREF 99 TM-värden i URL-parametrarna
`n` och `e`.

Appens automatiska vägledning använder de förinspelade MP3-filerna i `sounds`:
manlig röst för bäring och kvinnlig röst för avstånd. På iPhone används knappen
**Test** efter att navigeringen startats. Den spelar de inspelade talen 2, 4, 6,
8 och 10 med kvinnlig röst och låser samtidigt upp MP3-spelaren för den
fortsatta vägledningen. Appen använder inte webbläsarens talsyntes.
