# Portrait Chess Results

Bokmärket visar Chess-Results-tabeller i ett porträttvänligt läge. Det växlar mellan ställning och bordslista och kan dela vald tabell i flera jämna kolumner.

## Installera

1. Skapa ett nytt bokmärke i webbläsaren.
2. Ge bokmärket ett namn, till exempel `Porträtt CR`.
3. Kopiera hela innehållet i `bookmarklet.txt`.
4. Klistra in koden som bokmärkets URL/adress.
5. Spara bokmärket.

## Använda

1. Öppna turneringens startsida på Chess-Results, till exempel `https://s2.chess-results.com/tnr1301930.aspx?lan=1&art=0&flag=30&SNode=S0`.
2. Klicka på bokmärket.
3. Välj tabell med `↑` och `↓`.
4. Välj antal kolumner med `←` och `→`.
5. Stäng läget med `Esc` eller knappen `x`.

Bokmärket hämtar turneringens ställning (`art=1`) och bordslista (`art=2`) för den senaste rond som hittas på sidan. Om du kör bokmärket från en sida som redan har en rond vald används den ronden.

Antalet kolumner sparas separat för ställning och bordslista per turnering, så samma val finns kvar nästa gång bokmärket används.

## Beteende

Endast en tabell visas åt gången. När en tabell delas i flera kolumner upprepas tabellrubrikerna i varje kolumn.

Raderna fördelas så jämnt som möjligt. En tabell med 100 rader blir till exempel `50+50`, `33+33+34` eller `25+25+25+25` beroende på valt antal kolumner.

Bokmärket försöker behålla Chess-Results-tabellens utseende. Tomma kolumner i bredd minskas till en enda fem pixlar bred kolumn. Om tabellerna inte får plats tas `KLUBB`-kolumnen bort i den visade kopian.
