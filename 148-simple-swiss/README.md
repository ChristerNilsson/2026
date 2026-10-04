# Simple Swiss

`19069.txt` innehåller personliga frironder (namn följt av rondnummer) och sektionen `Strukna spelare fr o m` (namn följt av första rond spelaren ska uteslutas). Tidigare partier och motståndarhistorik behålls. Vid udda antal väljs en lottningsfrirond på 1 poäng bland behöriga spelare i stigande poäng/Elo, förutsatt att övriga kan paras. Personliga frironder ger fortsatt 0.5 poäng.

Målet med detta program är att förenkla koden maximalt.  
Koden har minskat från 8000 LOC till 250.  
Resultatet behöver inte bli identiskt.  
Algoritmen, förutom Blossom, går att utföra för hand.

Så här fungerar algoritmen:

Färger tilldelas enligt FIDE Dutch 2026-02-01, 5.2.1–5.2.5: bådas preferenser, starkare preferens, alternering vid senaste olika färger, högre rankades preferens och slutligen initialfärg/TPN. Färghistoriken innehåller endast spelade partier; walkover och frironder hoppas över. Initialfärg läses från `initialColor` om den finns, annars härleds den från första rondens lottning (vit används om underlag saknas).

Floathistorik beräknas per rond från poängen före ronden enligt FIDE Dutch från 1 februari 2026 (1.4.2–1.4.4). Uppskjutna resultat räknas preliminärt som 0.5. Personliga frironder med poäng och vunna walkoverpartier ger downfloat. C17 prioriterar motståndare som inte upfloatade två ronder tidigare; inom samma kategori provas fallande Elo. Kriteriet kan släppas om fullständig lottning annars saknas. Detta är fortfarande en förenklad algoritm, inte en fullständig implementation av alla Dutch-kriterier.

* Skapa poänggrupperna
* Se till att antalet i varje grupp blir jämnt.
  * Detta genom att eventuellt flytta ner den udda spelaren
  * Nedflyttaren paras med den första tillåtna deltagaren i den undre gruppen, sorterad på fallande Elo. Kandidater som bryter mot reglerna för tidigare möten eller färgbalans hoppas över.
* För varje grupp
  * Sortera på elo
  * Dela i S1 (övre halvan) och S2 (undre halvan). Endast celler mellan S1 och S2 är tillåtna. För en nedflyttare väljs dess motståndare först; återstående deltagare delas sedan i två Elo-halvor.
  * Beräkna avståndet till gruppens mitt med abs(abs(i,j)-n/2) ^ 1.01
  * Beräkna färgkostnaden
  * Lägg in avstånd och färgkostnad i varje cell
  * Låt Blossom utför parningen
  * Om Blossom misslyckas
    * Flytta de två översta spelarna från underliggande grupp till nuvarande grupp
    * Repetera tills Blossom lyckas para alla spelarna.

Exempel:
```
  1  CM Mikael Helin                 1941    3.5 |   4  Nils Carlsson                   2066    3.5
  7  Johan Sterner                   1771      3 |   2  WFM Susanna Berg Laachiri       1917    3.5
  9  FM Mikael Näslund               2124      3 |   6  Svante Wedin                    1937      3
 10  Bo E Eriksson                   2019      3 |   8  Rune Evertsson                  1879      3
 11  Stefan Bäcklin                  1975      3 |   5  Björn Löwgren                   1795      3
 12  Ivan Franchuk                   2071    2.5 |  14  Hans Weström                    1796    2.5
 18  Camilo Garcia Giraldo           1793    2.5 |  15  Henrik Strömbäck                2003    2.5
 21  Tomas Lindblad                  1997    2.5 |  22  Lars Cederfeldt                 1785    2.5
 20  Dick Viklund                    1781    2.5 |  17  Peter Carlsten                  1913    2.5
 13  Bo Franzén                      1824    2.5 |  16  Stefan Lindh                    1703    2.5
 35  Lars Ring                       1738      2 |  34  Lennart B. Johansson            1941      2
 33  Peter Silins                    1862      2 |  38  Abbas Razavi                    1691      2
 30  Thomas Axelsson                 1688      2 |  27  Ove Hartzell                    1861      2
 23  Leif Lundquist                  1856      2 |  36  Kent Sahlin                     1673      2
 32  Sven-Åke Karlsson               1828      2 |  29  Friedemann Stumpf               1673      2
 31  Jockum Wahlberg                 1774      2 |  24  Anders Hillbur                  1643      2
 26  Göran Adamsson                  1745      2 |  28  Valeri Ivanyuhin                1640      2
 40  Lars-Åke Pettersson             1765    1.5 |  37  Magnus Karlsson                 1737    1.5
 47  Leonid Stolov                   1718      1 |  42  Helge Bergström                 1545    1.5
 46  Bele Ullmark                    1823      1 |  49  Miroljub Zivic                  1594      1
 51  Ali Koc                         1459      1 |  43  Bengt Eriksson                  1688      1
 50  Jovan Nikander                  1492      1 |  48  Christer Nilsson                1599      1
 52  Lars-Ivar Juntti                1553    0.5 |  44  Jan Karlsson                       0      1
 53  Arne Jansson                    1496      0 |  54  Vida Radon                      1403    0.5
 ```
Lottningsordningen använder `pairingNumber`, importerat från spelarnumren i
`4.trf`. `number` behålls som visningsnummer och för tidigare motståndarreferenser.
Aktuell Elo ändrar inte den fastställda lottningsordningen. Underlag utan
`pairingNumber` använder `number`. Spelare skapade direkt utan lottningsnummer
sorteras fortfarande efter fallande Elo.

