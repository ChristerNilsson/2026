# Två A5-protokoll på ett A4-ark

[Try it!](https://christernilsson.github.io/2026/145-A4-protocol/)

Öppna `index.html` i en webbläsare. Ingen installation eller internetanslutning behövs.

Programmet skapar två liggande A4-sidor (297 × 210 mm) för dubbelsidig utskrift på ett ark. Den första sidan innehåller två likadana A5-framsidor med drag 1–60, den andra två likadana A5-baksidor med drag 61–120. Skär arket på mitten efter utskrift: du får två kompletta protokoll med 120 drag vardera. Halvorna är 148,5 × 210 mm (A5 avrundas normalt till 148 × 210 mm).

Varje drag har en ruta för vit och en för svart. Rutorna är cirka 18 mm breda och 6,4 mm höga. De tre dragkolumnerna ligger utan mellanrum. Det fyraradiga formuläret med matchuppgifter finns bara på framsidan. Ifyllda uppgifter och vald logotyp används på båda exemplaren.

Fyll i valfria matchuppgifter och välj eventuellt en liten bild eller logotyp. Tomma fält kan fyllas i med penna. Uppgifterna behålls bara medan fliken är öppen.

Standardrubriken är **Seniorschack Stockholm** och `seniorschackstockholm.svg` visas som logotyp på båda sidor. Du kan ändra rubriken och byta eller ta bort bilden. Bildväljaren stöder PNG, JPEG, WebP och SVG.

## Utskrift

Det färdiga A5-protokollet vänds längs långsidan. Varje A5-protokoll har 16 mm vänstermarginal på framsidan för hålslagning, utökat med 3 mm från tidigare 13 mm. På baksidan spegelvänds marginalen till höger så att hålen hamnar längs samma kant. Övriga marginaler är 8 mm. A5-layouten centreras i varje arkhalva med 0,25 mm extra på vardera sidan.

1. Lägg A4-papper i skrivaren och klicka på **Skriv ut protokollet**.
2. Välj A4, liggande format, 100 % skala och **en sida per ark**. Layouten innehåller redan två A5-protokoll per sida; välj inte två sidor per ark i utskriftsdialogen.
3. Aktivera dubbelsidig utskrift med **vändning längs kortsidan på det liggande A4-arket**. Det motsvarar **vändning längs långsidan på det färdiga A5-protokollet**, så att baksidan blir rättvänd.
4. Stäng av webbläsarens sidhuvud och sidfot. Förhandsvisningen ska visa exakt två sidor.
5. Skär längs den streckade mittlinjen, 148,5 mm från kortsidan. Båda halvorna har nu drag 1–60 på framsidan och 61–120 på baksidan.

Pappersformatet anges i CSS. Dubbelsidig utskrift måste väljas i skrivarens dialog; en webbsida kan inte aktivera den inställningen. Utan duplex skriver du ut sida 1 och matar sedan in samma ark för sida 2. Prova matningsriktningen med ett testark.

Du kan också välja **Spara som PDF** i utskriftsdialogen eller skriva ut den färdiga filen [protokoll-A4.pdf](protokoll-A4.pdf) med samma inställningar.
