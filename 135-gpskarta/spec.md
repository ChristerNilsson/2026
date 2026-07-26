Använd UTF-8

Jag behöver en webapp som visar var en koordinat är.

Man ska kunna se detta både på google maps och Min Karta från lantmäteriverket.

Man ska se bäring och avstånd till detta mål. I realtid.

Då bäringen ändrats tio grader ska en manlig röst informera om den nya bäringen. T ex ”ett åtta” vilket innebär 180 grader. Så länge man ligger i intervallet 175-185 är rösten tyst.
Alla ljud ligger i katalogen sounds.

Avstånd rapporteras med en kvinnlig röst vid följande gränser, i meter:
10,20,30,40,50,60,70,80,90, 100,200,300,400,500,600,700,800,900, 1000,2000 osv.

Det behövs ett textfält som tar emot WGS84. T ex ”59.2701, 18.1503”
Navigering startas med en knapp. Vore bra om kartan visas hela tiden eller mha en knapp. Kartan ska visa var man är samt var målet är.

Observera att minkarta kräver SWEREF. I urlen anges dessa som n= och e=

Jag använder iPhone. Testknappen ska läsa upp talet 4711.
Använd inspelade ljudfiler.

Acceptera även kommatecken mellan latitud och longitud.

Min karta ger följande länk om man vill dela en position.
Denna tänker jag klistra in i textrutan.
Se till att omvandla den till vårt interna WGS84-format.
(Troligen kan du ignorera `plats/3006/v2.0/?` och fokusera på e= och n=)
`https://minkarta.lantmateriet.se/plats/3006/v2.0/?e=679501&n=6574356&z=14&mapprofile=karta&layers=%5B%5B%223%22%5D%2C%5B%221%22%5D%5D`

Om avståndet är mindre än tio meter ska inte bäringen läsas upp.

Givet att man håller mobilen rakt fram, visa riktningen till målet. Denna ska ändras när man roterar eller går i fel riktning. Mobilen har en inbyggd kompass.
