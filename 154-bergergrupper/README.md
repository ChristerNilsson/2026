# Bergergrupper

Öppna `index.html` direkt i webbläsaren. Appen är fristående och kör helt i webbläsaren, utan backend, Python eller installation. Den kan också läggas på valfri statisk webbserver tillsammans med `tournament.js`.

1. Ange gruppstorlek 4, 6, 8, 10 eller 12 på TXT-filens första rad.
2. Välj en TXT-fil med spelare eller en sparad JSON-turnering. Efter lyckad inläsning inaktiveras filvalet. Ladda om sidan för att öppna en annan fil.
3. Registrera resultaten och byt aktuell rond med pilarna.
4. Klicka på **Spara players.json** för att ladda ned turneringen och `resultat.txt`. Webbläsaren kan behöva tillåta flera nedladdningar.

Alla filer använder UTF-8. `resultat.txt` har ett avsnitt per grupp med justerade kolumner för ID (tre tecken, utan punkt), namn (samma bredd i alla grupper), Elo, ronder, poäng och SB. Namn behåller å, ä, ö och övriga Unicode-tecken. W betyder vit, B svart, = remi, 1 vinst och 0 förlust. Ett streck betyder ospelat. Motståndarnas nummer är turneringens löpande spelarnummer. Schweizergruppen listas separat utan partier eftersom den hanteras utanför appen.

TXT ska vara UTF-8 med gruppstorlek på första raden, därefter Elo och namn åtskilda av tabb, en spelare per rad. Tomt Elo räknas som 0. Spelarna sorteras på fallande Elo och delas in i sammanhängande ratinggrupper. Bergernumren följer ratingordningen. JSON använder sin sparade gruppstorlek.

En restgrupp slås ihop med föregående grupp. Den sammanslagna sista gruppen markeras som Schweizergrupp och sparas utan lottning. Om deltagarantalet är mindre än gruppstorleken blir enda gruppen en Schweizergrupp. Vid jämn delning Bergerlottas alla grupper.

Bergerlottningen följer [FIDE:s Bergertabeller](https://handbook.fide.com/chapter/C05Annex1), inklusive färger och rondordning. Fyra spelare ger tre ronder; generellt n−1 ronder.

JSON innehåller gruppstorlek, aktuell rond, spelare, partier, resultat och ställningar. Import av JSON återställer turneringen, och ställningen räknas om från resultaten. Befintlig `players.json` från den tidigare versionen kan importeras. Vid lika poäng sorteras ställningen på fallande Sonneborn-Berger (SB), sedan Bergernummer.

Ändringar finns i minnet tills du laddar ned JSON-filen. Webbläsaren skriver inte automatiskt över den inlästa filen. Spara innan sidan stängs eller laddas om.

Grupperna heter A, B, C och vidare (efter Z följer AA). Namnen sparas också i JSON. Sidan har en gemensam ställningslista sorterad på grupp och fallande poäng, med grupp som kolumn. Schweizergruppen markeras och hanteras separat. Den gemensamma bordslistan visar aktuell rond och numrerar borden i en obruten följd över Bergergrupperna.

Spelarnas visade nummer löper från 1 genom alla grupper, även Schweizergruppen. Numret sparas som `player_number` i JSON. Gruppens interna `number` behålls som Bergernummer för lottningen.

Resultat kan matas in med tangentbordet. Använd Tab för att nå ett resultatfält: `1` ger vit vinst, mellanslag eller `=` ger remi och `0` ger svart vinst. Fokus flyttas automatiskt till nästa bord efter inmatning och wrappar från sista till första bordet. Pil upp och pil ned flyttar mellan borden. `Delete` rensar alltid resultatet och avancerar till nästa bord, även om fältet redan är tomt. Från sista bordet flyttas fokus till första.

Kör tester med `node tests/test_tournament.cjs` och `node tests/test_ui.cjs`.

SB visas i ställningen, JSON och resultat.txt. Beräkningen uppdateras efter varje resultat: motståndarens poäng vid vinst, halva vid remi och noll vid förlust.

Endast 1, 0, mellanslag, = och Delete kan ändra resultat med tangentbordet. Home, End, PageUp, PageDown, Enter och andra tangenter blockeras i resultatfälten. Tab och piltangenterna används för navigering.

Resultat kan bara matas in i tomma fält. Använd Delete för att radera ett befintligt resultat innan ett nytt anges.

Ett befintligt resultat kan bekräftas med samma tangentvärde för att avancera utan ändring. Ett annat resultat kräver Delete först. Pil upp och ned wrappar mellan första och sista bordet.
