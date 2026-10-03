# Simple Swiss

Målet med detta program är att förenkla koden maximalt.  
Koden har minskat från 8000 LOC till 250.  
Resultatet behöver inte bli identiskt.  
Algoritmen, förutom Blossom, går att utföra för hand.

Så här fungerar algoritmen:

* Skapa poänggrupperna
* Se till att antalet i varje grupp blir jämnt.
  * Detta genom att eventuellt flytta ner den udda spelaren
* För varje grupp
  * Sortera på elo
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