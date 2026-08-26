# Hitta vägen

Ett litet webbläsarspel där du navigerar från `START` till `TARGET`. Hela banan visas som en graf och endast de noder som är giltiga nästa drag går att klicka på. Din aktuella position är markerad.

[Try it!](https://christerNilsson.github.io/2026/137-Gamification/)

## Så fungerar det

1. Välj `bana.txt` eller `romb.txt` i listan **Bana**.
2. Börja på den markerade noden `START`.
3. Klicka på en tillgänglig nod i grafen för att flytta dig.
4. Fortsätt tills du når `TARGET`.

Alla kommande nivåer visas hela tiden. Grå noder går inte att nå från den aktuella positionen och kan därför inte klickas.

## Redigera en bana

Den valda filens innehåll visas under **Banans text**. Ändra texten och klicka på **Uppdatera visningen** för att bygga om grafen och börja om från `START`.

Indenteringen bestämmer nodernas placering och vilka förflyttningar som är tillåtna. Använd två blanksteg per indenteringssteg; Tab-tangenten infogar automatiskt två blanksteg i textfältet. En giltig bana ska ha:

- `START` som enda nod på första raden.
- En eller flera mellanliggande nivåer.
- `TARGET` som enda nod på sista raden.

Ändringar i textfältet påverkar bara den aktuella visningen och sparas inte tillbaka till txt-filen.

