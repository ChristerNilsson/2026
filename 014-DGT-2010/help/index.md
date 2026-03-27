[Try it!](https://christernilsson.github.io/2026/014-DGT-2010/)

Detta är ett förslag som visar hur man kan göra DGT 2010 lättare att använda.  
Det förutsätter att DGT genomför förändringar i mjukvaran.  
*Giljotin*, *Bronstein* och *byo-yomi* stöds ej.

Knapparna för setup är `-` `+` `A` `B`  
Knapparna för att starta klockan är `L` och `R`  
Omstart sker med `Refresh`  

|                | | | | | | |  |  |  |  |  |  |  |  |
|-               |-|-|-|-|-|-|- |- |- |- |- |- |- |- |
|*Grova* minuter | |1|2|3|4|5|10|15|20|25|30|45|60|90|
|*Grova* sekunder|0|1|2|3|4|5|10|15|20|25|30|  |  |  |
|*Fina* minuter  |0|1|2|..|98|99|
|*Fina* sekunder |0|1|2|..|58|59|

*Grov* tid och *fin* tid kan vara helt olika. Det är upp till användaren.  

Understruket tal ( visas nedan som `[90]`) innebär att `+` och `-` kan utföras på det talet.  

Efter att ha startat programmet, ser du t ex `[90]`:`30` och har följande val:
* `-` minska markerat tal, t ex `[90]`:`30` blir `[60]`:`30`
* `+` öka markerat tal, t ex `[60]`:`30` blir `[90]`:`30`
* `B` gå till nästa tal, t ex `90`:`[30]`
* `A` gå till *finjusteringen*, t ex `[90]`:`30` `90`:`30`
* `-` minska markerat tal, t ex `[90]`:`30` `90`:`30` blir `[89]`:`30` `90`:`30`
* `+` öka markerat tal, t ex `[89]`:`30` `90`:`30` blir `[90]`:`30` `90`:`30`
* `B` gå till nästa tal, t ex `90`:`[30]` `90`:`30`
* `L` höger klocka tickar
* `R` vänster klocka tickar
* `A` pausa klockan. Nu kan tider *finjusteras*. Fortsätt med `A`

#### Genvägar

`Refresh` => *grovinställd* tid. Starta med `L` eller `R`  
`Refresh` `A` => *fininställd* tid. Starta med `L` eller `R`  
