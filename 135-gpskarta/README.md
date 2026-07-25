# Kompass

En mobilanpassad webbapp som navigerar mot en WGS84-koordinat med GPS, bäring,
avstånd och röstmeddelanden. Google Maps öppnas med aktuell position och mål.
Min karta öppnas direkt vid målet med SWEREF 99 TM-värden i URL-parametrarna
`n` och `e`.

## Kör lokalt

Geolocation kräver en säker kontext. `localhost` räknas som säker:

```powershell
python -m http.server 8000
```

Öppna sedan `http://localhost:8000` och tillåt platsåtkomst.

Röster väljs bland enhetens svenska systemröster. Om enheten bara har en svensk
röst används den för både bäring och avstånd.
