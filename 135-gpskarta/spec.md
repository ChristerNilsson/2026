Använd UTF-8

Jag behöver en webapp som visar var en koordinat är.

Man ska kunna se detta både på google maps och Min Karta från lantmäteriverket.

Man ska se bäring och avstånd till detta mål. I realtid.

Då bäringen ändrats tio grader ska en manlig röst informera om den nya bäringen. T ex ”ett åtta” vilket innebär 180 grader. Så länge man ligger i intervallet 175-185 är rösten tyst.
Alla ljud ligger i katalogen sounds.

Avstånd rapporteras med en kvinnlig röst vid följande gränser, i meter:
10, 20, 50, 100, 200, 500 osv.

Det behövs ett textfält som tar emot WGS84. T ex ”63.12345 19.12345”
Navigering startas med en knapp. Vore bra om kartan visas hela tiden eller mha en knapp. Kartan ska visa var man är samt var målet är.

Observera att minkarta kräver SWEREF, såvitt jag vet.
I urlen anges dessa som n= och e=

Jag använder iPhone. Byt ut knappen "Ljud av/på" mot 'test'. Test ska läsa upp talen 2,4,6,8 och 10.
Eventuellt måste man använda inspelade ljudfiler för att höra något. iPhone kan ha problem med att skapa ljud från text.

Koordinatsystemet med DU och MÅL behövs inte.
Mål WGS84 behöver inte upprepas.
Bäring och Avstånd ska stå på samma rad.
Google Maps och Min karta ska stå på samma rad.

Acceptera även kommatecken mellan latitud och longitud.

Jag ser inte några gps-koordinater för min position på iPhone.