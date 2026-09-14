const fs = require('node:fs');
const source = fs.readFileSync('score.js', 'utf8');
const bookmarklet = 'javascript:' + encodeURIComponent(source);
fs.writeFileSync('bookmarklet.txt', bookmarklet + '\n');
fs.writeFileSync('index.html', `<!doctype html>
<html lang="sv"><meta charset="utf-8"><title>Poäng i bordslistan</title>
<style>body{font:18px system-ui;max-width:700px;margin:60px auto;padding:20px;line-height:1.6}a{color:#1254ad}</style>
<h1>Poäng i bordslistan</h1>
<p>Dra <a href="${bookmarklet.replace(/'/g, '&#39;')}">Visa score</a> till bokmärkesfältet.</p>
<p>Öppna <a href="https://member.schack.se/ShowTournamentServlet?id=19069">turneringen</a> och klicka på bokmärket. Spelarnas poäng visas i egna POÄNG-kolumner efter vit respektive svart spelares namn i bordslistan.</p>
<p>Klicka igen efter byte av rond eller omladdning. Poängen hämtas från resultatlistan som visas på sidan.</p>
</html>\n`);
