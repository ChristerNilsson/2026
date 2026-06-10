# Betygsmedelvärde

En liten webbapp som beräknar medelvärde för betyg.

## Användning

Öppna `index.html` i en webbläsare och skriv en sträng med betyg i fältet.

Betygsskalan är:

| Betyg | Värde |
| --- | ---: |
| A | 20 |
| B | 17.5 |
| C | 15 |
| D | 12.5 |
| E | 10 |
| F | 0 |

Stora bokstäver räknas som läsår med vikt `1`. Små bokstäver räknas som termin med vikt `0.5`.

## Exempel

`AB` ger:

```text
(20 + 17.5) / 2 = 37.5 / 2
```

`aBb` ger:

```text
(20/2 + 17.5 + 17.5/2) / (0.5 + 1 + 0.5)
```
