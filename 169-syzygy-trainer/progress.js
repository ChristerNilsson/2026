// Full-move numbering is irrelevant, but retain the fifty-move clock,
// castling and en-passant rights when recognizing a learned position.
export const positionKey = fen => fen.split(' ').slice(0, 5).join(' ');

export class ContinuationProgress {
  constructor(levels = []) {
    this.positions = new Set();
    this.levels = new Set(levels.filter(level => Number.isInteger(level) && level > 0));
  }

  complete(level) { this.levels.add(level); }

  canSkip(level, correct) { return correct && level > 1 && this.levels.has(level - 1); }

  knows(fen) { return this.positions.has(positionKey(fen)); }

  remember(game, player) {
    for (const move of game.history({verbose:true})) {
      if (move.color === player) this.positions.add(positionKey(move.before));
    }
  }
}
