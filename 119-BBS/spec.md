### Inledning

Jag behöver kod till ett bokmärke.

UTF-8 ska gälla.

Skapa följande filer:

* bookmarklet.txt
* sketch.js
* index.html

Koden i bokmärket ska se ut så här:

javascript:(()=>{const s=document.createElement('script');s.src='https://christernilsson.github.io/2026/119-BBS/sketch.js';document.head.appendChild(s)})()

Denna bookmarklet beöver inte sortera, inte para. Sortering är redan gjord. Parandet sker senare av ett annat program.

### Input

https://member.schack.se/ShowTournamentServlet?id=17900

Här hämtas deltagarnas Namn, Ranking samt Betalt och Avprickad

a = antalet avprickade
Om a==0 ska alla deltagare tas med. I annat fall bara de som är avprickade.

Deltagarna är redan sorterade.

### Tangenter

n är något av följande [4,6,8,10,12,14,16]

`+` : öka n med 2
`-` : Minska n med 2

### Output

d = antalet deltagare.

swiss = d modulo n

Om swiss == 0 ska alla grupperna vara Berger.

Om swiss > 0 ska de två sista grupperna slås ihop och utgöra en Schweizergrupp. Övriga blir Berger-grupper

Exempel på url:

http://127.0.0.1:5500/?turnering=Växjöspelen&n=4&players=1984 Adam Nilsson|1954 Bertil Svensson|1812 Cesar Persson|1776 David Eriksson|1912 Erik Karlsson|1917 Filip Jönsson|2026 Gustav Hansson|1945 Helge Ågren


