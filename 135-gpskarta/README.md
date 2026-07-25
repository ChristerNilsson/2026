# Kompass

[Try it](https://christernilsson.github.io/2026/135-gpskarta/)

En mobilanpassad webbapp som navigerar mot en WGS84-koordinat med GPS, bäring,
avstånd och röstmeddelanden. Google Maps öppnas med aktuell position och mål.
Min karta öppnas direkt vid målet med SWEREF 99 TM-värden i URL-parametrarna
`n` och `e`.

Röster väljs bland enhetens svenska systemröster. Om enheten bara har en svensk
röst används den för både bäring och avstånd. På iPhone används knappen **Test**
efter att navigeringen startats för att aktivera ljudet och läsa upp målets
koordinater. Detta ger Safari den användargest som krävs för talsyntes.
