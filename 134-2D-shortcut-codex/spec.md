UTF-8
# 2D Shortcut

Se till att skala sidan så att den får plats på en skärm.  
Se till att spelarna kan toucha sina knappar samtidigt utan förlust.  

## Background

1D-spel kan definieras med operationerna /2, +2 och *2.  
Exempel: 3 → 4 löses: 3 6 8 4

## Operations

- **Increment**: z = z + 1
- **Double**: z = 2 * z
- **Rotate**: z = z * i
- **Reflect**: Re och Im byter plats

## Game

Två spelare spelar samtidigt, var sitt koordinatsystem, sida vid sida.

Spelarna kan navigera utanför det visade koordinatsystemet.

## Controls

Tangentbord och touch-stöd.

```
Swap  Undo   Give up
+1    *2     *i

Q     W      E
A     S      D

U     I      O
J     K      L
```

## Levels

- Start: Level 1
- Måluppnåelse av båda spelare → Level +1
- Om ingen når målet → Level -1
- Level = antal operationer som krävs för att lösa

## Feedback

Efter att båda spelarna är klara (måluppnåelse eller ger upp):

- Visa båda spelarnas vägar tillsammans med den kortaste vägen
- Tabell med tre kolumner: Left (Red), Best (Shortest), Right (Blue)
- Format: `1 + 2i` (inte separerat)
- Värde = tid + 10 × antal operationer
- Markera vinnare med färg
- Två Next-knappar (Tab och Enter)
