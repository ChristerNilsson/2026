import { Chess } from './vendor/chess.js';
import { parseProblems, mateDistance, isPromotionProblem, isRookCaptureProblem, isDrawCategory } from './trainer.js';
import { isPawnEndgame } from './milestones.js';

export const KRK_START = '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1';

export function optimalMoves(fen, data, winningTurn) {
  const category = winningTurn ? 'loss' : 'win';
  const candidates = (data.moves ?? []).filter(move => move.category === category);
  if (!candidates.length) throw new Error('Inget vinnande fortsättningsdrag hittades.');
  const scored = candidates.map(move => {
    const distance = move.checkmate ? 0 : mateDistance(fen, move)?.moves;
    // Use half-moves for tie-breaking, not rounded full moves.
    const plies = move.checkmate ? 0 : Number.isInteger(move.dtm) ? Math.abs(move.dtm)
      : distance != null && Number.isInteger(move.precise_dtz) ? Math.abs(move.precise_dtz) : null;
    return { move, plies };
  });
  if (scored.some(item => item.plies === null)) {
    // The API orders moves by outcome and DTZ, including zeroing moves and
    // the fifty-move clock. Preserve that ordering when DTM is unavailable.
    const first = candidates[0];
    if (!Number.isInteger(first.dtz) && !Number.isInteger(first.precise_dtz)) {
      throw new Error('Tablebase saknar både mattavstånd och DTZ för fortsättningen.');
    }
    const distance = first.precise_dtz ?? first.dtz;
    return candidates.filter(move => Boolean(move.zeroing) === Boolean(first.zeroing)
      && Math.abs(move.precise_dtz ?? move.dtz) === Math.abs(distance)).map(move => move.uci);
  }
  const best = (winningTurn ? Math.min : Math.max)(...scored.map(item => item.plies));
  const tied = scored.filter(item => item.plies === best);
  return tied.map(item => item.move.uci);
}

export function randomOptimalMove(fen, data, winningTurn, random = Math.random) {
  const moves = optimalMoves(fen, data, winningTurn);
  return moves[Math.floor(random() * moves.length)];
}

export async function generateProblems(fen, probe, { signal, onProgress = () => {}, random = Math.random, goal = 'win' } = {}) {
  parseProblems([fen]);
  if (goal === 'draw') {
    signal?.throwIfAborted();
    const current = new Chess(fen).fen();
    const data = await probe(current, signal);
    signal?.throwIfAborted();
    if (!isDrawCategory(data.category)) throw new Error('Startpositionen måste gå att hålla remi i.');
    onProgress({count:1, remaining:null});
    return [current];
  }
  const game = new Chess(fen), positions = [];
  const promotionGoal = isPromotionProblem(fen) || isPawnEndgame(fen);
  const captureGoal = isRookCaptureProblem(fen);
  let winner;
  let expected;
  let exactLine = true;
  for (let ply = 0; ply < 512; ply++) {
    signal?.throwIfAborted();
    if (game.isGameOver()) {
      if (!game.isCheckmate() || game.turn() === winner) throw new Error('Varianten slutade inte med avsedd matt.');
      return positions;
    }
    const current = game.fen();
    const data = await probe(current, signal);
    signal?.throwIfAborted();
    if (winner === undefined) {
      if (!['win', 'loss'].includes(data.category)) throw new Error('Positionen har ingen säker vinst.');
      winner = data.category === 'win' ? game.turn() : game.turn() === 'w' ? 'b' : 'w';
    }
    const winningTurn = game.turn() === winner;
    if (data.category !== (winningTurn ? 'win' : 'loss')) throw new Error('Positionen har ingen säker vinst.');
    if (winningTurn) {
      const distance = promotionGoal || captureGoal ? null : mateDistance(current, data);
      if (!distance) exactLine = false;
      if (exactLine && expected !== undefined && distance.moves !== expected - 1) {
        throw new Error('Kunde inte skapa en följd med exakt ett steg per mattavstånd.');
      }
      expected = distance?.moves;
      positions.push(current);
      onProgress({ count: positions.length, remaining: exactLine ? expected : null });
    }
    const uci = randomOptimalMove(current, data, winningTurn, random);
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (promotionGoal && move.promotion && move.color === winner) return positions;
    if (captureGoal && move.captured === 'r' && move.color === winner) return positions;
  }
  throw new Error('Genereringen överskred 512 halvdrag.');
}
