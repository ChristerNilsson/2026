import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { parseCatalog } from './catalog.js';
import { generateProblems } from './generator.js';
import { cacheFilename, createProblemCache, parseProblemCache, serializeProblemCache } from './problem-cache.js';

const catalog = parseCatalog(JSON.parse(await readFile(new URL('./problems.json', import.meta.url))));
const names = process.argv.slice(2).map(name => name.toUpperCase());
for (const name of names) if (!catalog.some(entry => entry.name.toUpperCase() === name)) throw new Error(`Unknown problem: ${name}`);
const directory = new URL('./problem-cache/', import.meta.url);
await mkdir(directory, { recursive:true });
for (const entry of catalog.filter(entry => !names.length || names.includes(entry.name.toUpperCase()))) {
  const path = new URL(cacheFilename(entry.name), directory);
  try {
    const source = await readFile(path, 'utf8');
    const existing = parseProblemCache(JSON.parse(source), entry);
    const compact = serializeProblemCache(existing);
    if (source !== compact) await writeFile(path, compact);
    console.log(`${entry.name}: ${Buffer.byteLength(source)} -> ${Buffer.byteLength(compact)} bytes.`);
    console.log(`${entry.name}: cached, ${existing.positions.length} problems, ${existing.requests} original requests, 0 new requests.`);
    continue;
  } catch (error) {
    if (error.code !== 'ENOENT') console.log(`${entry.name}: replacing outdated or invalid cache (${error.message}).`);
  }
  const probes = new Map();
  let requests = 0;
  const probe = async fen => {
    if (probes.has(fen)) return probes.get(fen);
    for (let attempt = 0; attempt < 6; attempt++) {
      await delay(1100);
      requests++;
      const response = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, {signal:AbortSignal.timeout(30000)});
      if (response.status === 429 && attempt < 5) {
        const seconds = Math.max(Number(response.headers.get('retry-after')) || 0, 2 ** (attempt + 1));
        console.log(`${entry.name}: rate limited, retrying in ${seconds}s (${requests} requests).`);
        await delay(seconds * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`${entry.name}: HTTP ${response.status} after ${requests} requests`);
      const data = await response.json();
      if (!Array.isArray(data.moves) || data.category === 'unknown') throw new Error('Unknown tablebase position');
      probes.set(fen, data);
      return data;
    }
  };
  console.log(`${entry.name}: generating…`);
  const positions = await generateProblems(entry.fen, probe);
  await writeFile(path, serializeProblemCache(createProblemCache(entry, positions, probes, requests)));
  console.log(`${entry.name}: saved ${positions.length} problems, ${requests} requests.`);
}
