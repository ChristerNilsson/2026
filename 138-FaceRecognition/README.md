# Face Recognition

Träna på att känna igen namn och ansikten. För varje person är ordningen Text → Bild (välj bilden), Bild → Text (skriv namnet), Text → Bild, Bild → Text.

## [Try it!](https://christernilsson.github.io/2026/138-FaceRecognition/)

Personerna tränas i en aktiv kö med högst tio personer. Övriga väntar på sin tur. Efter varje svar flyttas personen sist i den aktiva kön. Fyra rätt i följd (TB → BT → TB → BT) gör personen avklarad och ersätter den med nästa väntande person. Fel svar eller ”Visa svar” nollställer personens följd till Text → Bild utan att ta in någon ny person. Avklarade och väntande personer kan fortfarande visas som bildalternativ.

Kön, framstegen och statistiken sparas lokalt i webbläsaren så att du kan fortsätta efter omladdning. Äldre statistik behålls, men den nya fyrastegsföljden börjar från noll. När kön är tom visas att alla personer är avklarade.

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
