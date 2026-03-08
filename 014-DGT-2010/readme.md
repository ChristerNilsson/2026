[Try it!](https://christernilsson.github.io/2026/014-DGT-2010/)

Detta är ett förslag som visar hur man kan göra DGT 2010 lättare att använda.  
Det förutsätter enbart förändringar i mjukvaran.  

Knapparna för setup är `-` `+` `A` `B`  
Knapparna för att starta klockan är `L` och `R`  
Omstart sker med `Refresh`  
Understruket tal innebär att `+` och `-` kan appliceras på det talet.  
Grova minuter: `1` `2` `3` `4` `5` `10` `15` `20` `25` `30` `45` `60` `90`  
Grova sekunder: `0` `1` `2` `3` `4` `5` `10` `15` `20` `25` `30`  

Grova tider: 
  * `01:00` `01:01` .. `01:25` `01:30`  
  * `90:00` `90:01` .. `90:25` `90:30`  

Fina tider: 
  * `00:00` `00:01` .. `00:58` `99:59`  
  * `99:00` `99:01` .. `99:58` `99:59`  

Man kan ställa in 13 X 11 = 341 grova tider och 100 x 60 = 6000 fina tider.  
[] motsvarar understruket tal.  

Efter att ha startat programmet, ser du t ex `[90]`:`30` och har följande val:
* `-` minska markerat tal, t ex [`90`]:`30` blir [`60`]:`30`
* `+` öka markerat tal, t ex [`60`]:`30` blir [`90`]:`30`
* `B` gå till nästa tal, t ex `90`:[`30`]
* `A` gå till finjusteringen, t ex [`90`]:`30` `90`:`30`
* `-` minska markerat tal, t ex [`90`]:`30` `90`:`30` blir [`89`]:`30` `90`:`30`
* `+` öka markerat tal, t ex [`89`]:`30` `90`:`30` blir [`90`]:`30` `90`:`30`
* `B` gå till nästa tal, t ex `90`:[`30`] `90`:`30`
* `L` starta klockan
* `R` starta klockan

Nu ser du t ex [`90`]:`30` `90`:`30`.  
Här kan du finjustera både minuter och sekunder samt införa handikapp
* `-` => [`89`]:`30` `90`:`30`
* `+` => [`90`]:`30` `90`:`30`
* `B` => `90`:[`30`] `90`:`30`
* `A` => `90`:`30` `90`:`30`
* `L` starta klockan
* `R` starta klockan

När du startat någon klocka, kan du pausa med `A`. Fortsätt med `A` igen.  
Vill du justera en klocka, använd `B`

#### Genvägar

`Refresh` `L` eller `R` => Den grovinställda tiden används  
`Refresh` `A` => Visar fininställd tid. Starta med `L` eller `R`  
Grov tid och fin tid kan vara helt olika. Det är upp till användaren.  

#### Skillnader gentemot originalklockan

* Du ställer enbart in minuter med basen. Inte timmar, inte sekunder.
* Du ställer enbart in sekunder med inkrementet. Inte minuter.
* Båda spelarnas tider ställs in samtidigt
* Du behöver inte komma ihåg vad optionerna står för. Dvs 17 = 90 + 30 osv
