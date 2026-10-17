# Bergergrupper

Skapa ett bokmärke med valfritt namn och klistra in följande rad som
**URL/adress**. Öppna sedan [första gruppen på schack.se](https://member.schack.se/ShowTournamentServlet?id=19095)
och klicka på bokmärket. Ingen installation eller inloggning på någon annan
webbplats behövs. Ersätt det gamla bokmärkets adress om du redan har ett.

<!-- BOOKMARKLET -->
```javascript
javascript:(()=>{if(location.hostname!=='member.schack.se'||location.protocol!=='https:'){alert('Kör bokmärket på member.schack.se');return}const u=location.href,w=open('','_blank');if(!w){alert('Tillåt popup-fönster för member.schack.se');return}w.document.body.textContent='Hämtar bordslistan från GitHub…';fetch('https://raw.githubusercontent.com/ChristerNilsson/2026/main/156-bergergrupper-2/dist/bergergrupper.js?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('GitHub HTTP '+r.status);return r.text()}).then(c=>{if(w.closed)return;w.BERGER_BOOT={sourceUrl:u};const s=w.document.createElement('script');s.textContent=c;w.document.head.append(s)}).catch(e=>{if(!w.closed)w.document.body.textContent='Kunde inte hämta bordslistan: '+e.message})})();void 0;
```
<!-- /BOOKMARKLET -->

Bokmärket hämtar den senaste koden från det publika GitHub-repots `main`-gren
och öppnar bordslistan i en ny flik. Tillåt popup-fönster för schack.se.

Bokmärket hittar automatiskt prefix och grupplänkar från första gruppens
sida och jämför deltagarantalet. **Sista gruppen ingår om den har samma
antal som den första; annars ignoreras den.** Antalet räknas från aktuell
bordslista så att ersatta spelare i resultattabellen inte räknas dubbelt.
Om bordslista saknas används deltagartabellen. Ett misslyckat anrop visas
som fel och räknas aldrig som en grupp med avvikande storlek.

För W2 väljs W2-1–W2-5 automatiskt; W2-6 har annat deltagarantal.
För exempelvis W1: öppna W1-1 och kör samma bokmärke. Prefix och grupper
bestäms helt av källsidans URL och grupplänkar; GUI:t har inga gruppval.

Välj rond, visa alla bord på skärm eller skriv ut listan med tomma
resultatrutor. Elotal och en gemensam bordsnummerserie ingår.
Ingen resultatinmatning, filimport eller Python behövs.

## Utveckling

Efter ändringar i `dist/app.js`, `dist/style.css` eller `dist/index.html`:

```sh
node build-bookmarklet.cjs
node tests/app.test.cjs
node tests/bookmarklet.test.cjs
```

Pusha även den genererade `dist/bergergrupper.js` till GitHub. Bokmärket
hämtar uppdaterad kod vid varje körning och behöver inte installeras om.
En GitHub Pages- eller Sites-publicering behövs inte.
