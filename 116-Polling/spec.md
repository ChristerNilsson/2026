Programmet ska hämta vald type med 60 sekunders intervall.

Skärmen ska bara uppdateras om det har kommit ny information.

Visa högst upp en räknare som räknar från 60 till 0 och sedan börjar om. 
Den ska trycka ner resten av sidan, någon centimeter.

type, tournament och height ska läsas från urlen. Om de saknas ska felmeddelande ges.

Vi har tre olika urler:

type = 1: url = https://chess-results.com/tnr1398028.aspx?lan=6&rd=-1&art=4
type = 2: utl = https://chess-results.com/tnr1398028.aspx?lan=6&rd=-1&art=2
type = 3: url = https://member.schack.se/ShowTournamentServlet?id=18469

Var och en av dessa typer har också en parameter height, som talar om var listan ska börja visas. Dvs vertikal position

Byt ut 1398028 och 18469 mot värdet i variabeln tournament. De är bara exempel.

http://localhost:8080/?type=1&tournament=1398028&height=725
http://localhost:8080/?type=2&tournament=1398028&height=725

http://localhost:8080/?type=3&tournament=18469&height=80
http://localhost:8080/?type=3&tournament=18469&height=1090
