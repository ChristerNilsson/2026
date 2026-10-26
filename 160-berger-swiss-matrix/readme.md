# Berger-Swiss Championship – Mötesmatris

[Try it!](https://christernilsson.github.io/2026/160-berger-swiss-matrix/)

Öppna länken ovan eller starta en lokal webbserver med `python -m http.server 8000` och gå till `http://localhost:8000`.

Matrisen bygger på `Berger-Swiss_Championship_final.json`: 33 spelare och 9 ronder.
Rad och kolumn anger spelare, och cellen visar rondnumret för deras möte.
Spelarnas startnummer och Elo visas på varje rad. Frironder räknas inte som möten.

Sök efter namn eller startnummer, filtrera på rond och ladda ner urvalet som CSV.
JSON-filen läses vid varje sidstart. Uppdatera filen och ladda om sidan för att visa nya data.

Bakgrund: https://mats-winther.github.io/berger-swiss.htm
