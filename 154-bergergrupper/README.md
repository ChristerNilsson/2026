# Exportera namn och Elo

Bookmarkleten hämtar namn och Elo från deltagartabellen på Schack.se och laddar ner en UTF-8-textfil. Den använder kolumnen ELO, eller RATING/RANKING om ELO saknas. Lottning, klubb, placering och resultat ignoreras.

## Installera

1. Skapa ett bokmärke i webbläsaren och kalla det **Exportera Elo**.
2. Öppna `bookmarklet.txt` och kopiera hela raden till bokmärkets URL/adressfält.
3. Öppna exempelvis https://member.schack.se/ShowTournamentServlet?id=19069 och klicka på bokmärket.

Filen sparas som `spelare-19069-elo.txt`. Den innehåller endast Elo och namn, åtskilda av en tabb, utan rubrikrad. Högsta Elo kommer först; vid samma Elo sorteras namnen alfabetiskt. Spelare utan rating hamnar sist med tomt Elo-fält.

`spelare-19069-elo.txt` är en export av den hämtade exempelsidan. `export-elo.js` innehåller bookmarkletens läsbara källkod.
