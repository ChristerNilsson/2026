"use strict";

const players = [
  { id: 1, name: "Sipilä Vilka", group: "A", elo: 2527, rounds: ["m+8", "v+2", "m+5", "v+6", "m+4", "v-3", "m+9"] },
  { id: 2, name: "Valkama Eero", group: "A", elo: 2234, rounds: ["v+5", "m-1", "v+8", "m-4", "v+9", "m+10", "m+3"] },
  { id: 3, name: "Torvinen Eetu", group: "A", elo: 1877, rounds: ["v-7", "m+17", "v=14", "m+15", "v+8", "m+1", "v-2"] },
  { id: 4, name: "Heino Juha", group: "A", elo: 2071, rounds: ["v+9", "m-5", "m+6", "v+2", "v-1", "m-8", "m+13"] },
  { id: 5, name: "Pasanen Tuomo", group: "A", elo: 2039, rounds: ["m-2", "v+4", "v-1", "m+8", "m-6", "v+13", "v+7"] },
  { id: 6, name: "Tuominen Matias", group: "A", elo: 1967, rounds: ["v+10", "m+7", "v-4", "m-1", "v+5", "m=9", "v=8"] },
  { id: 7, name: "Ahola Eetu", group: "A", elo: 1878, rounds: ["m+3", "v-6", "m-11", "v-18", "m+21", "v+16", "m-5"] },
  { id: 8, name: "Koskinen Riku", group: "A", elo: 2045, rounds: ["v-1", "m+9", "m-2", "v-5", "m-3", "v+4", "m=6"] },
  { id: 9, name: "Tuominen Tanja", group: "A", elo: 1991, rounds: ["m-4", "v-8", "m+18", "v+11", "m-2", "v=6", "v-1"] },
  { id: 10, name: "Moilanen Teppo", group: "A", elo: 1948, rounds: ["m-6", "v-18", "m=13", "v=21", "m+15", "v-2", "m-11"] },
  { id: 11, name: "Pohjala Ilari", group: "B", elo: 1770, rounds: ["v+20", "m+12", "v+7", "m-9", "v=14", "m=18", "v+10"] },
  { id: 12, name: "Kauko Pekka", group: "B", elo: 1746, rounds: ["m+19", "v-11", "v=17", "m+20", "m=16", "v+22", "m+18"] },
  { id: 13, name: "Markkanen Juho", group: "B", elo: 1784, rounds: ["v+15", "m=14", "v=10", "m+17", "v+18", "m-5", "v-4"] },
  { id: 14, name: "Pietinen Pekka", group: "B", elo: 1867, rounds: ["m=18", "v=13", "m=3", "v=16", "m=11", "v=15", "m=17"] },
  { id: 15, name: "Nousiainen Roni", group: "B", elo: 1807, rounds: ["m-13", "v+16", "m+26", "v-3", "v-10", "m=14", "m+21"] },
  { id: 16, name: "Patola Eero", group: "B", elo: 1815, rounds: ["v=17", "m-15", "v+20", "m=14", "v=12", "m-7", "v+25"] },
  { id: 17, name: "Tocklin Tomi", group: "B", elo: 1818, rounds: ["m=16", "v-3", "m=12", "v-13", "m+26", "v+19", "v=14"] },
  { id: 18, name: "Tähtikallio Jani", group: "B", elo: 1861, rounds: ["v=14", "m+10", "v-9", "m+7", "m-13", "v=11", "v-12"] },
  { id: 19, name: "Kärki Miska", group: "B", elo: 1741, rounds: ["v-12", "m-27", "m+28", "v+23", "v-24", "m-17", "m+22"] },
  { id: 20, name: "Vierjoki Timo", group: "B", elo: 1778, rounds: ["m-11", "v=21", "m-16", "v-12", "m+28", "v-25", "v-27"] },
  { id: 21, name: "Vannassalo Seppo", group: "C", elo: 1670, rounds: ["v+23", "m=20", "v+27", "m=10", "v-7", "m+24", "v-15"] },
  { id: 22, name: "Ahtola Aaron", group: "C", elo: 1552, rounds: ["v+30", "m+29", "v-24", "m+27", "v+23", "m-12", "v-19"] },
  { id: 23, name: "Kauko Jaakko", group: "C", elo: 1678, rounds: ["m-21", "v+28", "v+25", "m-19", "m-22", "v+26", "v+24"] },
  { id: 24, name: "Salvi Tuomas", group: "C", elo: 1692, rounds: ["v-25", "m+30", "m+22", "v+26", "m+19", "v-21", "m-23"] },
  { id: 25, name: "Riekkinen Keijo", group: "C", elo: 1694, rounds: ["m+24", "v-26", "m-23", "v-28", "v+27", "m+20", "m-16"] },
  { id: 26, name: "Järnström Henrik", group: "C", elo: 1704, rounds: ["v+27", "m+25", "v-15", "m-24", "v-17", "m-23", "v+29"] },
  { id: 27, name: "Peitsalo Olli-Pekka", group: "C", elo: 1717, rounds: ["m-26", "v+19", "m-21", "v-22", "m-25", "v+28", "m+20"] },
  { id: 28, name: "Rintakoski Pentti", group: "C", elo: 1624, rounds: ["v+29", "m-23", "v-19", "m+25", "v-20", "m-27", "v+36"] },
  { id: 29, name: "Rantamo Keijo", group: "C", elo: 1584, rounds: ["m-28", "v-22", "m-36", "v+33", "v+37", "m+30", "m-26"] },
  { id: 30, name: "Kaunonen Jouni", group: "C", elo: 1527, rounds: ["m-22", "v-24", "m+34", "v+32", "m=36", "v-29", "m-33"] },
  { id: 31, name: "Matomäki Touko", group: "D", elo: 1313, rounds: ["v+39", "m+38", "m-33", "v+40", "m+32", "v+36", "m+34"] },
  { id: 32, name: "Nyberg Max", group: "D", elo: 1328, rounds: ["v+38", "m+35", "v+37", "m-30", "v-31", "m+41", "v+42"] },
  { id: 33, name: "Saari Anton", group: "D", elo: 1384, rounds: ["v=36", "m-37", "v+31", "m-29", "v+41", "m+35", "v+30"] },
  { id: 34, name: "Kachanov Alexander", group: "D", elo: 1447, rounds: ["v+37", "m-36", "v-30", "m+35", "v+38", "m+39", "v-31"] },
  { id: 35, name: "Järvelä Helmi", group: "D", elo: 1263, rounds: ["m+40", "v-32", "m+39", "v-34", "m+42", "v-33", "m+41"] },
  { id: 36, name: "Rautiainen Olavi", group: "D", elo: 1405, rounds: ["m=33", "v+34", "v+29", "m=37", "v=30", "m-31", "m-28"] },
  { id: 37, name: "Korpela Olavi", group: "D", elo: 1408, rounds: ["m-34", "v+33", "m-32", "v=36", "m-29", "v+42", "m+40"] },
  { id: 38, name: "Hatharasinghe S S Senuja", group: "D", elo: 1359, rounds: ["m-32", "v-31", "v+41", "m+42", "m-34", "v-40", "v+39"] },
  { id: 39, name: "Sandberg Rasmus", group: "D", elo: 1325, rounds: ["m-31", "v+42", "v-35", "m+41", "m+40", "v-34", "m-38"] },
  { id: 40, name: "Hatharasinghe S S Oshini", group: "D", elo: 1221, rounds: ["v-35", "m+41", "v+42", "m-31", "v-39", "m+38", "v-37"] },
  { id: 41, name: "Puhtila August", group: "D", elo: 1122, rounds: ["m+42", "v-40", "m-38", "v-39", "m-33", "v-32", "v-35"] },
  { id: 42, name: "Puhtila Erik", group: "D", elo: 1150, rounds: ["v-41", "m-39", "m-40", "v-38", "v-35", "m-37", "m-32"] },
];

const byId = new Map(players.map((player) => [player.id, player]));
const seedById = new Map([
  [1, 1], [2, 2], [3, 10], [4, 3], [5, 5], [6, 7], [7, 9], [8, 4], [9, 6], [10, 8],
  [11, 18], [12, 19], [13, 16], [14, 11], [15, 15], [16, 14], [17, 13], [18, 12], [19, 20], [20, 17],
  [21, 26], [22, 29], [23, 25], [24, 24], [25, 23], [26, 22], [27, 21], [28, 27], [29, 28], [30, 30],
  [31, 38], [32, 36], [33, 34], [34, 31], [35, 39], [36, 33], [37, 32], [38, 35], [39, 37], [40, 40],
  [41, 42], [42, 41],
]);
const matrixPlayers = [...players].sort((a, b) => {
  const eloDiff = b.elo - a.elo;
  if (eloDiff !== 0) return eloDiff;
  return seedById.get(a.id) - seedById.get(b.id);
});
const matrixNoById = new Map(matrixPlayers.map((player, index) => [player.id, index + 1]));
const modelConfig = {
  roundCount: 2,
  scoreWeight: 1000,
  eloWeight: 1,
  groupWeight: 0,
  seedWeight: 0,
  colorPenalty: 30,
  calibrationWeight: 100000000,
};
const weightSearchSpace = {
  scoreWeight: [0, 100, 500, 1000],
  groupWeight: [0, 100, 500],
  eloWeight: [0.25, 0.5, 1, 2],
  seedWeight: [0, 1, 5],
  colorPenalty: [0, 10, 20, 30, 50],
};
const weightSearchConfig = {
  randomRestarts: 8,
  maxPasses: 12,
  randomSeed: 1337,
  ranges: {
    scoreWeight: [0, 3000],
    groupWeight: [0, 3000],
    eloWeight: [0, 10],
    seedWeight: [0, 300],
    colorPenalty: [0, 1000],
  },
  steps: {
    scoreWeight: [1000, 500, 250, 100, 50, 25],
    groupWeight: [1000, 500, 250, 100, 50, 25],
    eloWeight: [2, 1, 0.5, 0.25, 0.1],
    seedWeight: [100, 50, 25, 10, 5, 1],
    colorPenalty: [300, 150, 75, 30, 10, 5],
  },
};
let weightSearchResult = null;

const groupIndexByName = new Map([
  ["A", 0],
  ["B", 1],
  ["C", 2],
  ["D", 3],
]);
const calibrationBonusStats = new Map();

function recordCalibrationBonus(value) {
  calibrationBonusStats.set(value, (calibrationBonusStats.get(value) ?? 0) + 1);
}

function logCalibrationBonusStats() {
  console.log("calibrationBonus frequencies", Object.fromEntries([...calibrationBonusStats.entries()].sort((a, b) => a[0] - b[0])));
}

function applyWeights(weights) {
  modelConfig.scoreWeight = weights.scoreWeight;
  modelConfig.groupWeight = weights.groupWeight;
  modelConfig.eloWeight = weights.eloWeight;
  modelConfig.seedWeight = weights.seedWeight;
  modelConfig.colorPenalty = weights.colorPenalty;
}

function createRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function clampWeight(name, value) {
  const [min, max] = weightSearchConfig.ranges[name];
  return Math.min(max, Math.max(min, value));
}

function normalizeWeights(weights) {
  return Object.fromEntries(Object.entries(weights).map(([name, value]) => [name, clampWeight(name, value)]));
}

function randomWeights(random) {
  return Object.fromEntries(Object.entries(weightSearchConfig.ranges).map(([name, [min, max]]) => [
    name,
    min + ((max - min) * random()),
  ]));
}

function resultScore(token) {
  if (token.includes("+")) return 1;
  if (token.includes("=")) return 0.5;
  return 0;
}

function opponentId(token) {
  return Number(token.slice(2));
}

function color(token) {
  return token[0] === "v" ? "vit" : "svart";
}

function shortPair([a, b]) {
  return `${a}-${b}`;
}

function oppositeColor(colorCode) {
  return colorCode === "v" ? "m" : "v";
}

function actualColorForPair(round, a, b) {
  const token = byId.get(a).rounds[round - 1];
  return opponentId(token) === b ? token[0] : null;
}

function actualColorForOrientedPair(round, a, b) {
  const direct = actualColorForPair(round, a, b);
  if (direct) return direct;

  const reversed = actualColorForPair(round, b, a);
  return reversed ? oppositeColor(reversed) : null;
}

function actualResultForPair(round, a, b) {
  const token = byId.get(a).rounds[round - 1];
  if (opponentId(token) !== b) return null;
  return [resultScore(token), resultScore(byId.get(b).rounds[round - 1])];
}

function resultForPair(round, a, b) {
  const actual = actualResultForPair(round, a, b);
  if (actual) return actual;

  const reversed = actualResultForPair(round, b, a);
  if (reversed) return [reversed[1], reversed[0]];

  return [0, 0];
}

function colorNeed(state, playerId) {
  const diff = state.get(playerId).whiteCount - state.get(playerId).blackCount;
  if (diff > 0) return "m";
  if (diff < 0) return "v";
  return null;
}

function playerColorBalance(state, playerId) {
  return state.get(playerId).whiteCount - state.get(playerId).blackCount;
}

function pairColorBalance(state, a, b) {
  return playerColorBalance(state, a) + playerColorBalance(state, b);
}

function hasPlayed(state, a, b) {
  return state.get(a).opponents.has(b);
}

function createInitialState() {
  return new Map(players.map((player) => [player.id, {
    score: 0,
    whiteCount: 0,
    blackCount: 0,
    opponents: new Set(),
  }]));
}

function orderedIds(state) {
  return players.map((player) => player.id).sort((a, b) => {
    const scoreDiff = state.get(b).score - state.get(a).score;
    if (scoreDiff !== 0) return scoreDiff;
    const ratingDiff = byId.get(b).elo - byId.get(a).elo;
    if (ratingDiff !== 0) return ratingDiff;
    return seedById.get(a) - seedById.get(b);
  });
}

function lockedPairs(round) {
  return round === 1 ? actualPairs(1) : [];
}

function canPair(state, a, b) {
  return !hasPlayed(state, a, b) && Math.abs(pairColorBalance(state, a, b)) <= 2;
}

function eloDistance(a, b) {
  return Math.abs(byId.get(a).elo - byId.get(b).elo);
}

function pairCost(a, b) {
  const distance = eloDistance(a, b);
  return distance * distance;
}

function calibrationBonus(round, a, b) {
  const value = 0;
  recordCalibrationBonus(value);
  return value;
}

function colorCost(state, a, b) {
  return Math.abs(pairColorBalance(state, a, b)) * modelConfig.colorPenalty;
}

function matchingCost(state, round, a, b) {
  const scoreDiff = Math.abs(state.get(a).score - state.get(b).score) * modelConfig.scoreWeight;
  const eloDiff = eloDistance(a, b) * modelConfig.eloWeight;
  const groupDiff = Math.abs(groupIndexByName.get(byId.get(a).group) - groupIndexByName.get(byId.get(b).group))
    * modelConfig.groupWeight;
  const seedDiff = Math.abs(seedById.get(a) - seedById.get(b)) * modelConfig.seedWeight;
  const colorDiff = colorCost(state, a, b);
  const weightedDiff = scoreDiff + eloDiff + groupDiff + seedDiff + colorDiff;
  return (weightedDiff * weightedDiff) - calibrationBonus(round, a, b);
}

function minimumPerfectMatching(state, round, ids) {
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const idByIndex = new Map(ids.map((id, index) => [index, id]));
  const maxCost = Math.max(...ids.flatMap((a) => ids.map((b) => a === b ? 0 : matchingCost(state, round, a, b)))) + 1;
  const edges = [];

  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) {
      const a = ids[left];
      const b = ids[right];
      if (canPair(state, a, b)) {
        edges.push([indexById.get(a), indexById.get(b), maxCost - matchingCost(state, round, a, b)]);
      }
    }
  }

  const mate = new Edmonds(edges, true).maxWeightMatching();
  const pairs = [];
  const used = new Set();

  for (let index = 0; index < mate.length; index += 1) {
    const mateIndex = mate[index];
    if (mateIndex < 0 || used.has(index) || used.has(mateIndex)) continue;
    used.add(index);
    used.add(mateIndex);
    pairs.push([idByIndex.get(index), idByIndex.get(mateIndex)]);
  }

  return pairs;
}

function algorithmPairsForState(state, round) {
  if (round === 1) return actualPairs(1);

  const locked = lockedPairs(round).filter(([a, b]) => canPair(state, a, b));
  const lockedIds = new Set(locked.flat());
  const ids = orderedIds(state).filter((playerId) => !lockedIds.has(playerId));
  const pairs = minimumPerfectMatching(state, round, ids);

  return [...locked, ...pairs];
}

function colorForPair(state, round, a, b) {
  const actualColor = actualColorForOrientedPair(round, a, b);
  if (actualColor) return actualColor;

  const aNeed = colorNeed(state, a);
  const bNeed = colorNeed(state, b);

  if (aNeed && aNeed !== bNeed) return aNeed;
  if (bNeed && aNeed !== bNeed) return bNeed === "v" ? "m" : "v";
  return seedById.get(a) < seedById.get(b) ? "v" : "m";
}

function applyPredictedRound(state, round, pairs, colors) {
  for (const [a, b] of pairs) {
    const aState = state.get(a);
    const bState = state.get(b);
    const aColor = colors.get(pairKey(a, b));
    const bColor = aColor === "v" ? "m" : "v";

    aState.opponents.add(b);
    bState.opponents.add(a);
    const [aScore, bScore] = resultForPair(round, a, b);
    aState.score += aScore;
    bState.score += bScore;
    aState.whiteCount += aColor === "v" ? 1 : 0;
    aState.blackCount += aColor === "m" ? 1 : 0;
    bState.whiteCount += bColor === "v" ? 1 : 0;
    bState.blackCount += bColor === "m" ? 1 : 0;
  }
}

function buildPredictions() {
  const state = createInitialState();
  const rounds = [];

  for (let round = 1; round <= modelConfig.roundCount; round += 1) {
    const predicted = algorithmPairsForState(state, round);
    const colors = new Map(predicted.map(([a, b]) => [pairKey(a, b), colorForPair(state, round, a, b)]));
    rounds.push({ round, predicted, colors });
    applyPredictedRound(state, round, predicted, colors);
  }

  return rounds;
}

function scoreBefore(player, round) {
  return player.rounds.slice(0, round - 1).reduce((sum, token) => sum + resultScore(token), 0);
}

function scoreAfter(player, round) {
  return player.rounds.slice(0, round).reduce((sum, token) => sum + resultScore(token), 0);
}

function pairKey(a, b) {
  return [a, b].sort((left, right) => left - right).join("-");
}

function actualPairs(round) {
  const seen = new Set();
  const pairs = [];

  for (const player of players) {
    const opponent = opponentId(player.rounds[round - 1]);
    const key = pairKey(player.id, opponent);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([player.id, opponent]);
  }

  return pairs;
}

function comparableActualKeys(round) {
  return new Set(actualPairs(round).map(([a, b]) => pairKey(a, b)));
}

function matchStats(round, predicted) {
  const actual = comparableActualKeys(round);
  const matched = predicted.filter(([a, b]) => actual.has(pairKey(a, b))).length;
  return { matched, total: actual.size };
}

function colorMatchStats(round, predicted, colors) {
  const matched = predicted.filter(([a, b]) => {
    const expected = actualColorForOrientedPair(round, a, b);
    return expected && colors.get(pairKey(a, b)) === expected;
  }).length;

  return { matched, total: actualPairs(round).length };
}

function shortOrientedPair(round, pair, colors) {
  const [a, b] = pair;
  const colorCode = colors?.get(pairKey(a, b)) ?? actualColorForOrientedPair(round, a, b);
  return colorCode === "v" ? `${a}-${b}` : `${b}-${a}`;
}

function assertMatchesFile(round, predicted, colors) {
  const pairStats = matchStats(round, predicted);
  const colorStats = colorMatchStats(round, predicted, colors);

  if (pairStats.matched !== pairStats.total || colorStats.matched !== colorStats.total) {
    throw new Error(
      `Rond ${round} avviker från filen: par ${pairStats.matched}/${pairStats.total}, `
      + `färg ${colorStats.matched}/${colorStats.total}`,
    );
  }
}

function differenceStats(round, predicted, colors) {
  const actualPairsByKey = new Map(actualPairs(round).map((pair) => [pairKey(pair[0], pair[1]), pair]));
  const predictedPairsByKey = new Map(predicted.map((pair) => [pairKey(pair[0], pair[1]), pair]));
  const missing = [...actualPairsByKey]
    .filter(([key]) => !predictedPairsByKey.has(key))
    .map(([, pair]) => shortOrientedPair(round, pair));
  const extra = [...predictedPairsByKey]
    .filter(([key]) => !actualPairsByKey.has(key))
    .map(([, pair]) => shortOrientedPair(round, pair, colors));
  const wrongColors = [...actualPairsByKey]
    .filter(([key]) => {
      if (!predictedPairsByKey.has(key)) return false;
      const predictedPair = predictedPairsByKey.get(key);
      return colors.get(key) !== actualColorForOrientedPair(round, predictedPair[0], predictedPair[1]);
    })
    .map(([key, actualPair]) => {
      const predictedPair = predictedPairsByKey.get(key);
      return `${shortOrientedPair(round, predictedPair, colors)} ska vara ${shortOrientedPair(round, actualPair)}`;
    });

  return { missing, extra, wrongColors };
}

function evaluateCurrentWeights() {
  const entries = buildPredictions();
  const evaluatedRounds = entries.filter((entry) => entry.round >= 2);
  const pairHits = evaluatedRounds.reduce((sum, entry) => sum + matchStats(entry.round, entry.predicted).matched, 0);
  const colorHits = evaluatedRounds.reduce((sum, entry) => sum + colorMatchStats(entry.round, entry.predicted, entry.colors).matched, 0);
  const differences = evaluatedRounds.map((entry) => differenceStats(entry.round, entry.predicted, entry.colors));
  const missing = differences.reduce((sum, difference) => sum + difference.missing.length, 0);
  const extra = differences.reduce((sum, difference) => sum + difference.extra.length, 0);
  const wrongColors = differences.reduce((sum, difference) => sum + difference.wrongColors.length, 0);

  return {
    entries,
    pairHits,
    colorHits,
    missing,
    extra,
    wrongColors,
    score: (pairHits * 1000000) + (colorHits * 1000) - missing - extra - wrongColors,
  };
}

function evaluateWeights(weights) {
  applyWeights(normalizeWeights(weights));
  return evaluateCurrentWeights();
}

function betterEvaluation(candidate, incumbent) {
  if (!incumbent) return true;
  if (candidate.score !== incumbent.score) return candidate.score > incumbent.score;
  return Object.values(candidate.weights).reduce((sum, value) => sum + value, 0)
    < Object.values(incumbent.weights).reduce((sum, value) => sum + value, 0);
}

function coordinateImprove(startWeights) {
  let currentWeights = normalizeWeights(startWeights);
  let current = { ...evaluateWeights(currentWeights), weights: currentWeights };
  let evaluations = 1;

  for (let pass = 0; pass < weightSearchConfig.maxPasses; pass += 1) {
    let improved = false;

    for (const [name, steps] of Object.entries(weightSearchConfig.steps)) {
      for (const step of steps) {
        for (const direction of [-1, 1]) {
          const candidateWeights = normalizeWeights({
            ...currentWeights,
            [name]: currentWeights[name] + (direction * step),
          });
          const candidate = { ...evaluateWeights(candidateWeights), weights: candidateWeights };
          evaluations += 1;

          if (betterEvaluation(candidate, current)) {
            current = candidate;
            currentWeights = candidateWeights;
            improved = true;
          }
        }
      }
    }

    if (!improved) break;
  }

  return { best: current, evaluations };
}

function gridStartWeights() {
  const starts = [];

  let best = null;
  let tried = 0;

  for (const scoreWeight of weightSearchSpace.scoreWeight) {
    for (const groupWeight of weightSearchSpace.groupWeight) {
      for (const eloWeight of weightSearchSpace.eloWeight) {
        for (const seedWeight of weightSearchSpace.seedWeight) {
          for (const colorPenalty of weightSearchSpace.colorPenalty) {
            const weights = { scoreWeight, groupWeight, eloWeight, seedWeight, colorPenalty };
            const evaluation = { ...evaluateWeights(weights), weights: normalizeWeights(weights) };
            tried += 1;

            if (betterEvaluation(evaluation, best)) {
              best = evaluation;
            }
          }
        }
      }
    }
  }

  starts.push(best.weights);
  return { starts, tried, best };
}

function searchWeights() {
  const random = createRandom(weightSearchConfig.randomSeed);
  const grid = gridStartWeights();
  const starts = [
    ...grid.starts,
    ...Array.from({ length: weightSearchConfig.randomRestarts }, () => randomWeights(random)),
  ];
  let best = grid.best;
  let tried = grid.tried;

  for (const start of starts) {
    const improved = coordinateImprove(start);
    tried += improved.evaluations;

    if (betterEvaluation(improved.best, best)) {
      best = improved.best;
    }
  }

  applyWeights(best.weights);
  weightSearchResult = {
    tried,
    best,
    randomRestarts: weightSearchConfig.randomRestarts,
    maxPasses: weightSearchConfig.maxPasses,
  };
  return best.entries;
}

function roundCost(pairs) {
  return pairs.reduce((sum, [a, b]) => sum + pairCost(a, b), 0);
}

function matrixDistance([a, b]) {
  return Math.abs(matrixNoById.get(a) - matrixNoById.get(b));
}

function qualityStats(roundEntries) {
  const pairs = roundEntries.flatMap(({ pairs }) => pairs);
  const totalDistance = pairs.reduce((sum, pair) => sum + matrixDistance(pair), 0);
  const totalEloDistance = pairs.reduce((sum, pair) => sum + eloDistance(pair[0], pair[1]), 0);
  const totalSquaredEloDistance = pairs.reduce((sum, pair) => sum + pairCost(pair[0], pair[1]), 0);

  return {
    pairs: pairs.length,
    meanDistance: totalDistance / pairs.length,
    meanEloDistance: totalEloDistance / pairs.length,
    meanSquaredEloDistance: totalSquaredEloDistance / pairs.length,
    totalDistance,
    totalEloDistance,
    totalSquaredEloDistance,
  };
}

function totalScore(player) {
  return scoreAfter(player, modelConfig.roundCount);
}

const predictions = searchWeights();

function predictedOpponentIds(playerId) {
  return predictions.flatMap(({ predicted }) => (
    predicted
      .filter(([a, b]) => a === playerId || b === playerId)
      .map(([a, b]) => (a === playerId ? b : a))
  ));
}

function repeatedPredictedPairCount() {
  const counts = new Map();

  for (const { predicted } of predictions) {
    for (const [a, b] of predicted) {
      const key = pairKey(a, b);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function renderMetrics() {
  const totalPairs = (players.length * modelConfig.roundCount) / 2;
  const modelTotal = predictions.reduce((sum, entry) => sum + matchStats(entry.round, entry.predicted).matched, 0);
  const modelPossible = predictions.reduce((sum, entry) => sum + matchStats(entry.round, entry.predicted).total, 0);
  const colorTotal = predictions.reduce((sum, entry) => sum + colorMatchStats(entry.round, entry.predicted, entry.colors).matched, 0);
  const colorPossible = predictions.reduce((sum, entry) => sum + colorMatchStats(entry.round, entry.predicted, entry.colors).total, 0);
  const strongestOpponents = new Set(predictedOpponentIds(1)).size;
  const repeatedPairs = repeatedPredictedPairCount();
  const actualQuality = qualityStats(actualRoundEntries());
  const predictedQuality = qualityStats(predictedRoundEntries());
  const evaluatedPairCount = actualRoundEntries()
    .filter((entry) => entry.round >= 2)
    .reduce((sum, entry) => sum + entry.pairs.length, 0);

  document.querySelector("#metrics").innerHTML = [
    ["Spelare", players.length, "42 deltagare, sorterade om efter elo i matriserna"],
    ["Ronder", modelConfig.roundCount, `${totalPairs} partier modelleras`],
    ["Rond 1", "fil", "alla resultat och färger läses in"],
    ["Algoritm", `${modelTotal}/${modelPossible}`, "träffar mot faktisk lottning"],
    ["Färger", `${colorTotal}/${colorPossible}`, "vit/svart stämmer mot filen"],
    ["Matchning", "P+G+E+F", "poäng, grupp, elo och färgbalans"],
    ["Vikter", `${modelConfig.scoreWeight}/${modelConfig.groupWeight}/${modelConfig.eloWeight}/${modelConfig.seedWeight}/${modelConfig.colorPenalty}`, "P/G/E/S/F, valda av sökning"],
    ["Sökning", weightSearchResult.tried, `tester, ${weightSearchResult.randomRestarts} slumpstarter, bäst ${weightSearchResult.best.pairHits}/${evaluatedPairCount} par och ${weightSearchResult.best.colorHits}/${evaluatedPairCount} färger`],
    ["Godhet", predictedQuality.meanEloDistance.toFixed(0), `elo i snitt mot faktisk ${actualQuality.meanEloDistance.toFixed(0)}`],
    ["Starkast", `${strongestOpponents}/7`, "olika algoritm-motståndare för spelare 1"],
    ["Returmöten", repeatedPairs, "upprepade par i algoritmens lottning"],
  ].map(([label, value, text]) => `
    <article class="metric">
      <span class="muted">${label}</span>
      <strong>${value}</strong>
      <span>${text}</span>
    </article>
  `).join("");
}

function renderConclusion() {
  document.querySelector("#conclusion").innerHTML = `
    <p>
      Modellen kör rond 2. Rond 1 paras inte av modellen, utan läses direkt från filen
      med både resultat och färger. Rond 2 lottas utan kalibreringsbonus och jämförs mot filen.
    </p>
    <p>
      Rond 2 viktas med poängskillnad, gruppskillnad, eloskillnad och färgbalans. Skillnadsrapporten
      visar vilka par som saknas, vilka algoritmen lade till och om något gemensamt par har fel färg.
    </p>
    <p>
      Återstående missar visar att modellen fortfarande är en rekonstruktion, men jämförelsen visar
      explicit hur väl algoritmen sammanfaller med utfallet i Tasaselo-filen.
    </p>
  `;
}

function renderAlgorithm() {
  document.querySelector("#algorithm").innerHTML = `
    <ol>
      <li>Starta med spelarnas start-elo från resultatfilen.</li>
      <li>Läs rond 1 från filen och spara resultat, färger och tidigare möten.</li>
      <li>För rond 2 byggs alla möjliga par som inte redan har mötts.</li>
      <li>Färgbalans är W-B. För ett par adderas spelarnas balanser; par med absolut summa över 2 tas bort.</li>
      <li>Varje Blossom-cell summerar viktad poängskillnad, gruppskillnad, eloskillnad och färgbalansstraff; summan kvadreras sedan.</li>
      <li>Viktsökning kör gridstart plus coordinate search med ${weightSearchResult.randomRestarts} deterministiska slumpstarter utan kalibreringsbonus.</li>
      <li>Valda vikter: poäng ${modelConfig.scoreWeight}, grupp ${modelConfig.groupWeight}, elo ${modelConfig.eloWeight}, seed ${modelConfig.seedWeight}, färg ${modelConfig.colorPenalty}, kalibrering 0.</li>
      <li>Färgerna hämtas mot filens orientering när paret finns där; par visas som vit-svart, till exempel 1-2.</li>
      <li>En perfekt matchning med minsta totalvikt söks över hela fältet med blossom.js.</li>
      <li>Godhetstalet visar både elo-medelavstånd och medelavstånd mellan spelarnas nya elo-sorterade matrisnummer.</li>
    </ol>
  `;
}

function renderRounds() {
  document.querySelector("#rounds").innerHTML = predictions.map(({ round, predicted, colors }) => {
    const pairs = actualPairs(round);
    const stats = matchStats(round, predicted);
    const colorStats = colorMatchStats(round, predicted, colors);
    const differences = differenceStats(round, predicted, colors);
    const comment = round === 1
      ? "Rond 1 läses från filen och används som state."
      : "Matchning utan kalibreringsbonus på poäng, grupp, elo och färgbalans.";
    const differenceText = [
      differences.missing.length ? `Saknas: ${differences.missing.join(", ")}` : "",
      differences.extra.length ? `Extra: ${differences.extra.join(", ")}` : "",
      differences.wrongColors.length ? `Fel färg: ${differences.wrongColors.join(", ")}` : "",
    ].filter(Boolean).join("<br>");
    const hitClass = stats.matched >= Math.ceil(stats.total * 0.5) ? "ok" : "warn";

    return `
      <tr>
        <td>${round}</td>
        <td>${pairs.map((pair) => shortOrientedPair(round, pair)).join(", ")}</td>
        <td>${predicted.map((pair) => shortOrientedPair(round, pair, colors)).join(", ")}</td>
        <td><span class="${hitClass}">${stats.matched}/${stats.total}, färg ${colorStats.matched}/${colorStats.total}</span></td>
        <td>${roundCost(predicted)}</td>
        <td>${comment}</td>
        <td>${differenceText || "Inga skillnader"}</td>
      </tr>
    `;
  }).join("");
}

function pairingMatrix(roundEntries) {
  const matrix = new Map(players.map((player) => [player.id, new Map()]));

  for (const { round, pairs } of roundEntries) {
    for (const [a, b] of pairs) {
      matrix.get(a).set(b, round);
      matrix.get(b).set(a, round);
    }
  }

  return matrix;
}

function renderMatrix(headSelector, bodySelector, roundEntries) {
  const matrix = pairingMatrix(roundEntries);

  document.querySelector(headSelector).innerHTML = `
    <tr>
      <th>Nr</th>
      ${matrixPlayers.map((player) => {
        const matrixNo = matrixNoById.get(player.id);
        return `<th title="${matrixNo}. ${player.id} ${player.name}">${matrixNo % 10}</th>`;
      }).join("")}
      <th>Elo</th>
    </tr>
  `;

  document.querySelector(bodySelector).innerHTML = matrixPlayers.map((rowPlayer) => `
    <tr>
      <th title="${rowPlayer.id} ${rowPlayer.name}">${matrixNoById.get(rowPlayer.id)}</th>
      ${matrixPlayers.map((columnPlayer) => {
        const rowId = rowPlayer.id;
        const columnId = columnPlayer.id;
        if (rowId === columnId) return '<td class="empty">-</td>';
        const round = matrix.get(rowId).get(columnId);
        return round
          ? `<td class="played">${round}</td>`
          : '<td class="empty"></td>';
      }).join("")}
      <th>${rowPlayer.elo}</th>
    </tr>
  `).join("");
}

function actualRoundEntries() {
  return Array.from({ length: modelConfig.roundCount }, (_, index) => ({
    round: index + 1,
    pairs: actualPairs(index + 1),
  }));
}

function predictedRoundEntries() {
  return predictions.map(({ round, predicted }) => ({
    round,
    pairs: predicted,
  }));
}

function renderMatrixQuality() {
  const actual = qualityStats(actualRoundEntries());
  const predicted = qualityStats(predictedRoundEntries());
  const winner = predicted.meanSquaredEloDistance < actual.meanSquaredEloDistance
    ? "Blossom har lägre Elo²-kostnad"
    : "Faktisk lottning har lägre Elo²-kostnad";

  document.querySelector("#matrix-quality").innerHTML = [
    ["Faktisk", actual.meanEloDistance.toFixed(0), `elo i snitt, Elo² ${actual.meanSquaredEloDistance.toFixed(0)}`],
    ["Blossom", predicted.meanEloDistance.toFixed(0), `elo i snitt, Elo² ${predicted.meanSquaredEloDistance.toFixed(0)}`],
    ["Jämförelse", winner, `elo-skillnad ${(actual.meanEloDistance - predicted.meanEloDistance).toFixed(0)}, matrissteg ${(actual.meanDistance - predicted.meanDistance).toFixed(2)}`],
  ].map(([label, value, text]) => `
    <article class="metric">
      <span class="muted">${label}</span>
      <strong>${value}</strong>
      <span>${text}</span>
    </article>
  `).join("");
}

function renderMatrices() {
  renderMatrixQuality();
  renderMatrix("#actual-matrix-head", "#actual-matrix", actualRoundEntries());
  renderMatrix("#predicted-matrix-head", "#predicted-matrix", predictedRoundEntries());
}

function renderPlayers() {
  document.querySelector("#players").innerHTML = players.map((player) => `
    <tr>
      <td>${player.id}</td>
      <td>${matrixNoById.get(player.id)}</td>
      <td>${seedById.get(player.id)}</td>
      <td>${player.name}</td>
      <td>${player.group}</td>
      <td>${player.elo}</td>
      <td>${totalScore(player).toFixed(1).replace(".", ",")}</td>
      <td>${player.rounds.slice(0, modelConfig.roundCount).map((token, index) => {
        const opponent = byId.get(opponentId(token));
        return `R${index + 1}: ${color(token)} ${token[1]} ${opponent.id}`;
      }).join("; ")}</td>
    </tr>
  `).join("");
}

renderMetrics();
renderConclusion();
renderAlgorithm();
renderRounds();
renderMatrices();
renderPlayers();
logCalibrationBonusStats();
