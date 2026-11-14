import { Chess } from './vendor/chess.js';

export function parseProblems(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('JSON-filen ska vara en lista med FEN-strängar.');
  return data.map((fen, i) => {
    if (typeof fen !== 'string') throw new Error(`Problem ${i + 1} är inte en FEN-sträng.`);
    try {
      const game = new Chess(fen);
      if (game.isGameOver()) throw new Error();
      if (game.board().flat().filter(Boolean).length > 7) throw new Error();
    } catch { throw new Error(`Problem ${i + 1} måste vara en giltig, ej avslutad position med högst 7 pjäser.`); }
    return fen;
  });
}

export function nextIndex(index, difficulty, length) {
  return Math.max(0, Math.min(length - 1, index - difficulty));
}

export function mateDistance(fen, data) {
  if (!['win', 'loss'].includes(data.category)) return null;
  if (Number.isInteger(data.dtm)) return { moves: Math.ceil(Math.abs(data.dtm) / 2), source: 'DTM' };
  // In KQK and KRK, a capture ends the winning material. On a winning
  // line the next zeroing event is therefore mate, so precise DTZ is DTM.
  const material = fen.split(' ')[0].replace(/[1-8/]/g, '').toLowerCase().split('').sort().join('');
  if (['kkq', 'kkr'].includes(material) && Number.isInteger(data.precise_dtz)) {
    return { moves: Math.ceil(Math.abs(data.precise_dtz) / 2), source: 'exakt DTZ för KQK/KRK' };
  }
  return null;
}

export function defenseMove(data) {
  const first = data.moves?.[0];
  if (!first) throw new Error('Tablebase saknar ett lagligt svarsdrag.');
  // Preserve the API outcome ordering. Among equally losing replies,
  // maximize exact distance to mate when DTM is available.
  const losing = data.moves.filter(m => m.category === 'win');
  if (first.category === 'win' && losing.every(m => Number.isInteger(m.dtm))) {
    return losing.reduce((best, m) => Math.abs(m.dtm) > Math.abs(best.dtm) ? m : best).uci;
  }
  return first.uci;
}
