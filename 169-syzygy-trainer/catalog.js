import { parseProblems } from './trainer.js';

export function parseCatalog(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
    throw new Error('problems.json ska vara ett objekt med problemnamn och listor av FEN-strängar.');
  }
  const grouped = 'winning' in data || 'drawing' in data;
  const entries = grouped ? Object.entries(data).flatMap(([group, problems]) => {
    if (!['winning', 'drawing'].includes(group) || !problems || typeof problems !== 'object' || Array.isArray(problems)) throw new Error('Ogiltig problemgrupp.');
    return Object.entries(problems).map(([name, value]) => [name, value, group === 'drawing' ? 'draw' : 'win']);
  }) : Object.entries(data).map(([name, value]) => [name, value, 'win']);
  if (!entries.length) throw new Error('Problemkatalogen är tom.');
  return entries.map(([name, value, goal]) => {
    if (!name.trim()) throw new Error('Ett problem saknar namn.');
    let fens;
    try { fens = parseProblems(Array.isArray(value) ? value : [value]); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
    return { name, fen:fens[0], fens, goal };
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
