[Try it!](https://christernilsson.github.io/2026/014-DGT-2010/)

Detta är ett förslag som ska göra DGT 2010 lättare att använda.  

Knapparna är - + A B  
Knapparna då man spelar heter L och R  
Understruket tal innebär att **+** och **-** kan användas på det talet.  
Grova minuter: ```1 2 3 4 5 10 15 20 25 30 45 60 90```  
Grova sekunder: ```0 1 2 3 4 5 10 15 20 25 30```  
Grova tider, ex: ```03:02 10:05 12:00 15:10 45:15 90:30```  
Fina tider, ex: ```06:07```  

Efter att ha startat programmet, ser du t ex <u>90</u>:30 och har följande val:
* **-** minskar markerat tal, t ex 90 blir 60
* **+** ökar markerat tal, t ex 60 blir 90
* **B** går till nästa tal, t ex 90:<u>30</u>
* **A** går till finjusteringen, t ex <u>90</u>:30 90:30
* **L** startar klockan
* **R** startar klockan

Nu ser du t ex <u>90</u>:30 90:30.  
Här kan du finjustera både minuter och sekunder samt införa handikapp
* **-** => <u>89</u>:30 90:30
* **+** => <u>90</u>:30 90:30
* **B** => 90:<u>30</u> 90:30
* **A** => 90:30 90:30
* **L** startar klockan
* **R** startar klockan

När du startat någon klocka, kan du pausa med **A**. Fortsätt med **A** igen.  
Vill du justera en klocka, använd **B**

#### Genvägar
Refresh **L** eller **R** => Den grovinställda tiden används  
Refresh **A** => Visar fininställd tid. Starta med **L** eller **R**  

### Skillnader gentemot originalklockan
* Du ställer enbart in minuter med basen. Inte timmar, inte sekunder.
* Du ställer enbart in sekunder med inkrementet. Inte minuter.
* Båda spelarnas tider ställs in samtidigt
* Du behöver inte komma ihåg vad optionerna står för. Dvs 17 = 90 + 30 osv

### Hantering av extra kvart.
* Maxtid är 99 minuter.
* Vill du ställa in 90+15=105, kan du istället öka inkrementet med 15.
  * Blir samma sak för 60 drag.
```
90 + 30 vs 105 + 30
blir då istället
90 + 30 vs 90 + 45
```