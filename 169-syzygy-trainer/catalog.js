import { parseProblems } from './trainer.js';

export function parseCatalog(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
    throw new Error('problems.json ska vara ett objekt med problemnamn och listor av FEN-strängar.');
  }
  return Object.entries(data).map(([name, value]) => {
    if (!name.trim()) throw new Error('Ett problem saknar namn.');
    let fens;
    try { fens = parseProblems(Array.isArray(value) ? value : [value]); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
    return { name, fen:fens[0], fens };
  });
}

export function chooseProblem(entry, random = Math.random) {
  const problemIndex = Math.floor(random() * entry.fens.length);
  return {...entry, fen:entry.fens[problemIndex], problemIndex};
}

export function problemLabel(name) {
  const descriptions = { KQK: 'Kung och dam mot kung', KRK: 'Kung och torn mot kung' };
  return descriptions[name] ? `${name} · ${descriptions[name]}` : name;
}
