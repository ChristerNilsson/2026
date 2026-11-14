import { Chess } from './vendor/chess.js';
import { parseProblems, mateDistance } from './trainer.js';

export const KRK_START = '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1';

export function randomOptimalMove(fen, data, winningTurn, random = Math.random) {
  const category = winningTurn ? 'loss' : 'win';
  const candidates = (data.moves ?? []).filter(move => move.category === category);
  if (!candidates.length) throw new Error('Inget vinnande fortsättningsdrag hittades.');
  const scored = candidates.map(move => {
    const distance = move.checkmate ? 0 : mateDistance(fen, move)?.moves;
    // Use half-moves for tie-breaking, not rounded full moves.
    const plies = move.checkmate ? 0 : Number.isInteger(move.dtm) ? Math.abs(move.dtm)
      : distance != null && Number.isInteger(move.precise_dtz) ? Math.abs(move.precise_dtz) : null;
    if (plies === null) throw new Error('Exakt mattavstånd saknas för ett drag. Genereringen har avbrutits.');
    return { move, plies };
  });
  const best = (winningTurn ? Math.min : Math.max)(...scored.map(item => item.plies));
  const tied = scored.filter(item => item.plies === best);
  return tied[Math.floor(random() * tied.length)].move.uci;
}

export async function generateProblems(fen, probe, { signal, onProgress = () => {}, random = Math.random } = {}) {
  parseProblems([fen]);
  const game = new Chess(fen), winner = game.turn(), positions = [];
  let expected;
  for (let ply = 0; ply < 512; ply++) {
    signal?.throwIfAborted();
    if (game.isGameOver()) {
      if (!game.isCheckmate() || game.turn() === winner) throw new Error('Varianten slutade inte med avsedd matt.');
      return positions;
    }
    const current = game.fen();
    const data = await probe(current, signal);
    signal?.throwIfAborted();
    const winningTurn = game.turn() === winner;
    if (data.category !== (winningTurn ? 'win' : 'loss')) throw new Error('Positionen har ingen säker vinst.');
    if (winningTurn) {
      const distance = mateDistance(current, data);
      if (!distance || (expected !== undefined && distance.moves !== expected - 1)) {
        throw new Error('Kunde inte skapa en följd med exakt ett steg per mattavstånd.');
      }
      expected = distance.moves;
      positions.push(current);
      onProgress({ count: positions.length, remaining: expected });
    }
    const uci = randomOptimalMove(current, data, winningTurn, random);
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  throw new Error('Genereringen överskred 512 halvdrag.');
}
