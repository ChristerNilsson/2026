# 2D Shortcut

[Try it](https://christernilsson.github.io/2026/134-2D-shortcut-codex/)

Two players race side by side on separate coordinate grids. Each player starts at
the same complex number and tries to reach the green target using the fewest
useful operations.

## Controls

| Player | Swap | Undo | Give up | +1 | *2 | *i |
| --- | --- | --- | --- | --- | --- | --- |
| Red | Q | W | E | A | S | D |
| Blue | U | I | O | J | K | L |

The game also works with touch by pressing the on-screen buttons.

## Rules

Points are shown as complex numbers, for example `2 + 3i`.

Available operations:

```text
+1   z = z + 1
*2   z = 2 * z
*i   z = z * i
Swap Re and Im
```

The level starts at 1. If both players reach the target, the next level is one
step harder. If neither player reaches the target, the next level is one step
easier. The drawn coordinate limit is `4 + 2 * level`.

After both players finish, the feedback view compares Red's path, the shortest
path, and Blue's path. Each executed operation costs 10 seconds, including
operations that are later undone, so the score is:

```text
time in seconds + operation cost
```
