# Face Recognition

Träna på att känna igen namn och ansikten. För varje person är ordningen Text → Bild (välj bilden), Bild → Text (skriv namnet).

## [Try it!](https://christernilsson.github.io/2026/138-FaceRecognition/)

Personerna tränas i omgångar med högst tio personer. De första personerna väljs slumpmässigt; övriga väntar på sin tur. Varje person får en fråga per omgång. Två rätt i följd (TB → BT) gör personen avklarad och tar bort den ur kön. När hela omgången är genomgången fylls kön på till högst tio med slumpmässigt valda väntande personer. Därefter blandas hela den aktiva kön inför nästa omgång, även om ingen ny person togs in. Fel svar eller ”Visa svar” nollställer personens följd till Text → Bild. Avklarade och väntande personer kan fortfarande visas som bildalternativ.

Kön, framstegen och statistiken sparas lokalt i webbläsaren så att du kan fortsätta efter omladdning. Sparade framsteg från fyrastegsföljden behålls: personer med minst två rätt i följd räknas som avklarade. Statistik från äldre format behålls, men utan sparade frågesteg börjar följden från noll. När kön är tom visas att alla personer är avklarade.

På slutskärmen finns knappen **Rensa och börja om**. Den rensar träningens sparade data i localStorage och startar direkt med nollställd statistik och en ny slumpmässig kö med högst tio personer.

## Uppdatera personerna

Lägg bilderna i katalogen `faces`. Filnamnet används som personens namn, där understreck ersätts med mellanslag:

```text
Anna_Andersson.jpg → Anna Andersson
```

Skapa sedan om `faces.json`:

```powershell
python generate_faces_json.py
```

## Köra lokalt

Eftersom sidan hämtar `faces.json` behöver projektet serveras via HTTP:

```powershell
python -m http.server 8000
```

Öppna därefter <http://localhost:8000>.

## Testa träningslogiken

Kör `node --test training.test.cjs`.
