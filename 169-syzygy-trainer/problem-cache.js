import { Chess } from './vendor/chess.js';
import { parseProblems, isPromotionProblem, isRookCaptureProblem } from './trainer.js';
import { isPawnEndgame } from './milestones.js';
import { optimalMoves } from './generator.js';
import { mateDistance, defenseMove } from './trainer.js';

function compactProbe(fen, data) {
  const keep = new Set([data.moves[0]?.uci]);
  if (data.moves.length) keep.add(defenseMove(data));
  for (const category of ['win', 'loss']) {
    const moves = data.moves.filter(move => move.category === category);
    if (!moves.length) continue;
    try {
      for (const uci of optimalMoves(fen, data, category === 'loss')) keep.add(uci);
    } catch {
      // Retain unscored moves so incomplete analyses remain incomplete.
      for (const move of moves) keep.add(move.uci);
    }
    // Keep evidence of missing distances: removing it could switch the
    // scorer from DTZ to DTM or change the defense's longest-mate policy.
    keep.add(moves.find(move => !Number.isInteger(move.dtm))?.uci);
    keep.add(moves.find(move => !move.checkmate && !Number.isInteger(move.dtm)
      && !(mateDistance(fen, move) && Number.isInteger(move.precise_dtz)))?.uci);
  }
  const fields = object => Object.fromEntries(Object.entries(object).filter(([key, value]) =>
    ['category', 'uci'].includes(key) || (['dtm', 'dtz', 'precise_dtz'].includes(key) && Number.isInteger(value))
    || (['zeroing', 'checkmate'].includes(key) && value === true)));
  return {...fields(data), moves:data.moves.filter(move => keep.has(move.uci)).map(fields)};
}

export function compactProblemCache(data) {
  return {...data, probes:Object.fromEntries(Object.entries(data.probes).map(([fen, response]) => [fen, compactProbe(fen, response)]))};
}

export function serializeProblemCache(data) {
  return JSON.stringify(compactProblemCache(data)) + '\n';
}

export function cacheFilename(name, index = 0) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Ogiltigt filnamn för problemcache.');
  if (!Number.isInteger(index) || index < 0) throw new Error('Ogiltigt problemindex.');
  return `${name.toLowerCase()}${index ? `-${index + 1}` : ''}.json`;
}

export function parseProblemCache(data, entry) {
  if (data?.version !== 1 || data.name !== entry.name || data.seed !== entry.fen) {
    throw new Error('Problemcachen matchar inte startpositionen.');
  }
  const positions = parseProblems(data.positions);
  if (isPawnEndgame(entry.fen) && (data.goal !== 'promotion-or-mate' || positions.some(fen => /[qrbn]/i.test(fen.split(' ')[0])))) {
    throw new Error('Bondeslutspelscachen måste sluta vid promovering eller matt.');
  }
  if (isPromotionProblem(entry.fen) && (data.goal !== 'promotion' || positions.some(fen => !isPromotionProblem(fen)))) {
    throw new Error('KPK-cachen måste sluta vid promovering.');
  }
  if (isRookCaptureProblem(entry.fen) && (data.goal !== 'rook-or-mate' || positions.some(fen => !isRookCaptureProblem(fen)))) {
    throw new Error('KQKR-cachen måste sluta vid tornslag eller matt.');
  }
  if (!Number.isInteger(data.requests) || data.requests < 0 || !data.probes || typeof data.probes !== 'object') {
    throw new Error('Ogiltig problemcache.');
  }
  for (const [fen, response] of Object.entries(data.probes)) {
    new Chess(fen);
    if (!['win', 'loss'].includes(response?.category) || !Array.isArray(response.moves)) {
      throw new Error('Ogiltigt tablebase-svar i problemcachen.');
    }
  }
  for (const fen of positions) {
    if (data.probes[fen]?.category !== 'win') throw new Error('Problemcachen saknar analys för ett delproblem.');
  }
  return { ...data, positions };
}

export function createProblemCache(entry, positions, probes, requests) {
  return parseProblemCache(compactProblemCache({version:1, name:entry.name, seed:entry.fen, goal:isPawnEndgame(entry.fen) ? 'promotion-or-mate' : isPromotionProblem(entry.fen) ? 'promotion' : isRookCaptureProblem(entry.fen) ? 'rook-or-mate' : 'mate',
    createdAt:new Date().toISOString(), requests, positions, probes:Object.fromEntries(probes)}), entry);
}
