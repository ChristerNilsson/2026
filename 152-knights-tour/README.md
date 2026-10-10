# Knights Tour – träningsapp

En enkel webbapp för att träna på Knights Tour i en 8x8-bräda.

## Funktioner

- Fast lösning visas först på brädan.
- Start från valfri ruta och i valfri riktning.
- Kör i blint läge utan visade ledtrådar.
- Första fel stoppar tiden.
- Lösningen är tänkt att gå tillbaka till d4 i den fasta sekvensen.

## Kör lokalt

1. Öppna terminalen i projektmappen.
2. Starta en enkel webserver:
   `python -m http.server 8000`
3. Gå till `http://localhost:8000` i webbläsaren.

## Notes

Den fasta lösningen visualiseras från den fördefinierade sekvensen i `script.js`.
