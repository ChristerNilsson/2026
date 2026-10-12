# Schackträd

```powershell
python -m pip install -r requirements.txt
python chess_tree.py
```

Programmet läser alla PGN-filer i `data` och underkataloger, behåller alla
huvudvarianter och deras eval i minnet och sorterar alfabetiskt efter SAN-drag,
kolumn för kolumn. Sidovarianter tas inte med. Resultatet sparas i `index.html`.
Egna sökvägar kan anges med `--data` och `--output`.
Programmet varnar i terminalen med filnamnet om eval saknas helt eller för
vissa drag i huvudvarianterna. Partierna läses fortfarande in.

Varje parti får en rad med högst 34 enskilda drag (halvdrag). Gemensamma
inledningsdrag med föregående utskrivna parti lämnas tomma.
HTML-tabellens kolumnbredder följer innehållet och cellerna har diskreta linjer. Första raden
innehåller dragnumren: `1 .. 2 .. 3 ..` till `17 ..`.
Efter dragkolumnerna står orsaken och sist en klickbar länk från PGN:s
`ChapterURL` (alternativt `Site`). Datum och spelarnamn skrivs inte ut.
Länkarna visas med texten `Länk` i stället för URL:en.
Öppna `index.html` i en webbläsare. Om partiet saknar länk lämnas den tom.

Utskriften slutar vid det första draget där något av följande gäller;
det draget inkluderas:

- `A3.45`: eval-värdets absolutbelopp överstiger 3.0 bönder.
- `R1.2`: skillnadens absolutbelopp mellan aktuellt och föregående drags
  eval överstiger 1.0 bönder. Detta är en skillnad i bönder, inte procent.
- `Slut:1-0`, `Slut:0-1`, `Slut:1/2-1/2` eller `Slut:*`: partiets slut
  nåddes utan att någon gräns passerades; resultatet hämtas från PGN.

Om gränsen på 34 drag nås innan partiets slut lämnas orsaken tom.

Om båda eval-gränserna passeras på samma drag används A. Gränserna är
strikta: exakt 1.0 respektive 3.0 räcker inte. Eval läses från `[%eval ...]`
och räknas alltid ur vits perspektiv. Saknade eval-värden uppskattas inte;
R beräknas bara mellan angränsande positioner som båda har eval. Första
draget jämförs med startpositionen bara om även den har eval i PGN.
Mattvärden behandlas som +/-10000 bönder och ger därmed `A10000`.
