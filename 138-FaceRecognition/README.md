# Face Recognition

Träna på att känna igen namn och ansikten. Uppgifterna blandas mellan att skriva namnet till en bild och att välja rätt bild till ett namn.

## [Try it!](https://christernilsson.github.io/2026/138-FaceRecognition/)

Statistiken sparas lokalt i webbläsaren. Personer som du ofta svarar fel på visas oftare.

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
