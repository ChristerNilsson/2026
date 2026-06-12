# Shortcut

Shortcut is a two-player math puzzle game. Both players receive the same generated challenge and race to transform their current number into the target using as few commands as possible.

[Try it!](https://christernilsson.github.io/2026/132-Shortcut-codex/)

## How To Play

Each round starts with a generated start value and target. The start value is not shown separately because each player's current value begins there. Players act at the same time, either with the keyboard or by touching the on-screen buttons.

The available commands are:

| Command | Player 1 | Player 2 | Effect |
| --- | --- | --- | --- |
| Half | `A` | `Left` | Divides by 2. Only works on even numbers. |
| Add 2 | `S` | `Down` | Adds 2. |
| Double | `D` | `Right` | Multiplies by 2. |
| Undo | `W` | `Up` | Removes the previous command. |
| Give up | `Esc` | `Backspace` | Stops that player's attempt. |

The small key diagrams show the keyboard layout for each player. The plain number to the right of `Undo` is not a button; it shows the shortest remaining number of commands from the current value to the target and counts down to `0`.

Player 1 is marked with red on the left side, like port. Player 2 is marked with green on the right side, like starboard.

## Scoring

A player's score is:

```text
thinking time + 10 seconds per command
```

Lower is better. The timer is not shown during play, but time is measured internally until a player solves the challenge or gives up.

## Levels And Limits

Level starts at `1`.

After each round:

- If both players solve the challenge, level increases by 1.
- If neither player solves the challenge, level decreases by 1, but never below 1.
- If only one player solves the challenge, level stays the same.

The maximum value for generated start and target numbers starts at `20` and increases by `5` per level. Intermediate results may be up to six digits.

## Results

When both players are done, the result page shows three aligned columns:

- Player 1's path
- The optimal path
- Player 2's path

Rows are aligned so the start value, first intermediate value, second intermediate value, and so on share the same height across all three columns.

The winner's total score is shown in green. The loser's total score is shown in red. If both solved with the same score, neither score is highlighted.

Both players must agree to continue:

- Player 1 presses `Tab` or touches `Next [Tab]`.
- Player 2 presses `Enter` or touches `Next [Enter]`.

The next problem starts only after both players are ready.

## Files

- `index.html` contains the UI and styling.
- `sketch.js` contains the game state, command handling, challenge generation, scoring, level logic, and shortest-path search.
- `spec.md` contains the project specification.
