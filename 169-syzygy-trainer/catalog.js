import { parseProblems } from './trainer.js';

export function parseCatalog(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
    throw new Error('problems.json ska vara ett objekt med problemnamn och FEN-strängar.');
  }
  return Object.entries(data).map(([name, fen]) => {
    if (!name.trim()) throw new Error('Ett problem saknar namn.');
    try { parseProblems([fen]); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
    return { name, fen };
  });
}

export function problemLabel(name) {
  const descriptions = { KQK: 'Kung och dam mot kung', KRK: 'Kung och torn mot kung' };
  return descriptions[name] ? `${name} · ${descriptions[name]}` : name;
}
