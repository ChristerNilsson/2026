### Allmänt

UTF-8 ska gälla.

Skapa följande filer:

* sketch.js
* index.html

Programmet ska hantera ett antal bergergrupper med n deltagare i varje grupp.  
Med n deltagare blir det n-1 ronder.

Antag att vi har 48 spelare.

Dessa ska lottas i 12 bergergrupper med tre ronder

Gruppnamnen är A B C D E F G H I J K och L.

I navigeringsinformationen vill jag att • används istf kommatecken som separator

Hjälptexten "Mata in varje resultat två gånger" behövs ej.

### Url till en turnering med anmälda

Jag behöver en webapplikation som accepterar en parameter n för gruppstorlek samt en lista med spelarnamn.

Exempel:

http://127.0.0.1:5500/?turnering=Växjö spelen&n=4&players=1984 Adam Nilsson_1954 Bertil Svensson_1812 Cesar Persson_1776 David Eriksson_1912 Erik Karlsson_1917 Filip Jönsson_2026 Gustav Hansson_1945 Helge Ågren

De första fyra tecknena utgör elo-talet.
Spelarna ska sorteras enligt fallande elo-tal
Lottningen behöver ej stå i urlen, den är samma varje gång.

Resultaten lagras i urlen i bordsordning:

r1=110r010011rr0011rr00rr11  
r2=110r010011rr0011rr00rr11  
r3=110r010011rr0011rr00rr11  

Remi visas alltså med r.

Urlen uppdateras för varje inmatat resultat

Bergerlottningen ska skötas med hjälp av berger_4.js

### Bordslistan ser ut så här, 24 rader

Lämplig rubrik

Grupp Bord Vit   Resultat Svart
A     1    Adam     -     Bertil
A     2    Cesar    -     David
B     3    Erik     -     Filip
osv

### Standings ser ut så här, 48 rader

Lämplig rubrik

Grupp Id Namn Elo  1   2   3   Poäng
A     1  Adam 1234 2w= 3b1 4w0 1.5
osv

### Navigering med tangenter

Left, Right: Byter rond
Up, Down: Byter bord

1 = vit vinst
0 = vit förlust
space = remi
r = remi

Delete = tar bort ett resultat

Tangenterna 1, 0, space, r och Delete innebär alltid att "cursorn" flyttas till nästa bord.

### Kontroll av inmatning

Man ska kunna mata in resultaten två gånger för att säkerställa korrekt inmatning.
Då man trycker på 10r andra gången flaggas mismatch med röd färg.
Delete måste användas om man vill ändra ett resultat.

Exempel:
Första inmatning: 1r0
Andra  inmatning: 100

Nu ska det andra bordet visa rött. Då går man dit, trycker på Delete och matar in korrekt resultat

### Sortering av Standings

1. Grupp
2. Poäng
3. Inbördes möte (om möjligt)
4. Sonneborn-Berger
5. Antal vinster