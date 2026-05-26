Denna fil löser CORS-problemet.

Jag vill visa t ex Chess Results eller member.schack på en skärm i porträtt-läge.

En server måste vara igång lokalt, på fairpair.se eller render.com
Vill man ha en sida visad går man dit och då hämtas sidan.

### chess results

* http://localhost:8080/?type=1&tournament=1398028&height=725
* http://localhost:8080/?type=2&tournament=1398028&height=725

### member.schack.se

* http://localhost:8080/?type=3&tournament=18469&height=80
* http://localhost:8080/?type=3&tournament=18469&height=1090

T ex 
christer.onrender.com/?type=3&tournament=18469&height=80

Lokal server startas med ```npm start```

Skärmarna i porträtt mode kommer inte att kunna påverkas.
De uppdateras en gång per minut.

Tävlingsledaren använder en enda dator för att mata in resultat.

Den behöver tre skärmar:
* En för att uppdatera och ge kommandon. Denna är inte publik
* En för Standings
* En för Pairings

Vi har alltså tre olika workspaces och tre portar till tre skärmar.

Två workspaces visas i porträttläge. Det tredje kan vara landskap.

Har man inte en dator med tre portar, kan man använda tre datorer med vars en hdmi-utgång istället.