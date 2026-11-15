export function isPawnEndgame(fen) {
  const material = fen.split(' ')[0].replace(/[1-8/]/g, '');
  return /^[kKpP]+$/.test(material) && (material.match(/p/gi) ?? []).length > 1;
}

export function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export class Milestones {
  constructor() {
    this.entries = [];
    this.observedPly = 0;
    this.bestPawnGain = 0;
    this.previousTime = 0;
    this.previousCount = 0;
  }

  observe(game, player, category, elapsed, count) {
    const history = game.history({verbose:true});
    if (history.length <= this.observedPly) return;
    const recent = history.slice(this.observedPly);
    this.observedPly = history.length;
    // Evaluate after the reply, so an immediate recapture is a pawn trade.
    // Categories here are always from the player's point of view.
    if (category !== 'win') return;
    const gain = history.reduce((sum, move) => sum + (move.captured === 'p' ? move.color === player ? 1 : -1 : 0), 0);
    const labels = [];
    if (gain > this.bestPawnGain && recent.some(move => move.color === player && move.captured === 'p')) {
      this.bestPawnGain = gain;
      labels.push('Bonde vunnen');
    }
    if (recent.some(move => move.color === player && move.promotion)) labels.push('Promovering');
    if (game.isCheckmate() && game.turn() !== player) labels.push('Schackmatt');
    if (!labels.length) return;
    const entry = {label:labels.join(' och '), moves:count - this.previousCount,
      elapsed:elapsed - this.previousTime, totalMoves:count, totalElapsed:elapsed};
    this.entries.push(entry);
    this.previousTime = elapsed;
    this.previousCount = count;
    return entry;
  }
}
