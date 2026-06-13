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
  lockedRoundOneBoards: 3,
};

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

function expectedScore(own, opponent) {
  const raw = 1 / (1 + 10 ** ((opponent - own) / 400));
  return Math.min(0.92, Math.max(0.08, raw));
}

function kFactor(playerId) {
  const elo = byId.get(playerId).elo;
  if (elo >= 2200) return 16;
  if (elo >= 1800) return 24;
  if (elo >= 1400) return 32;
  return 40;
}

function effectiveRating(state, playerId) {
  return state.get(playerId).rating;
}

function colorNeed(state, playerId) {
  const diff = state.get(playerId).whiteCount - state.get(playerId).blackCount;
  if (diff > 0) return "m";
  if (diff < 0) return "v";
  return null;
}

function hasPlayed(state, a, b) {
  return state.get(a).opponents.has(b);
}

function createInitialState() {
  return new Map(players.map((player) => [player.id, {
    rating: player.elo,
    whiteCount: 0,
    blackCount: 0,
    opponents: new Set(),
  }]));
}

function orderedIds(state) {
  return players.map((player) => player.id).sort((a, b) => {
    const ratingDiff = effectiveRating(state, b) - effectiveRating(state, a);
    if (ratingDiff !== 0) return ratingDiff;
    return seedById.get(a) - seedById.get(b);
  });
}

function lockedPairs(round) {
  return round === 1 ? actualPairs(1).slice(0, modelConfig.lockedRoundOneBoards) : [];
}

function canPair(state, a, b) {
  if (hasPlayed(state, a, b)) return false;
  const aNeed = colorNeed(state, a);
  const bNeed = colorNeed(state, b);
  return !(aNeed && bNeed && aNeed === bNeed);
}

function eloDistance(a, b) {
  return Math.abs(byId.get(a).elo - byId.get(b).elo);
}

function pairCost(a, b) {
  const distance = eloDistance(a, b);
  return distance * distance;
}

function minimumPerfectMatching(state, ids) {
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const idByIndex = new Map(ids.map((id, index) => [index, id]));
  const maxCost = Math.max(...ids.flatMap((a) => ids.map((b) => a === b ? 0 : pairCost(a, b)))) + 1;
  const edges = [];

  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) {
      const a = ids[left];
      const b = ids[right];
      if (canPair(state, a, b)) {
        edges.push([indexById.get(a), indexById.get(b), maxCost - pairCost(a, b)]);
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
  const locked = lockedPairs(round).filter(([a, b]) => canPair(state, a, b));
  const lockedIds = new Set(locked.flat());
  const ids = orderedIds(state).filter((playerId) => !lockedIds.has(playerId));
  const pairs = minimumPerfectMatching(state, ids);

  return [...locked, ...pairs];
}

function colorForPair(state, a, b) {
  const aNeed = colorNeed(state, a);
  const bNeed = colorNeed(state, b);

  if (aNeed && aNeed !== bNeed) return aNeed;
  if (bNeed && aNeed !== bNeed) return bNeed === "v" ? "m" : "v";
  return seedById.get(a) < seedById.get(b) ? "v" : "m";
}

function applyPredictedRound(state, pairs) {
  for (const [a, b] of pairs) {
    const aState = state.get(a);
    const bState = state.get(b);
    const aColor = colorForPair(state, a, b);
    const bColor = aColor === "v" ? "m" : "v";

    aState.opponents.add(b);
    bState.opponents.add(a);
    aState.whiteCount += aColor === "v" ? 1 : 0;
    aState.blackCount += aColor === "m" ? 1 : 0;
    bState.whiteCount += bColor === "v" ? 1 : 0;
    bState.blackCount += bColor === "m" ? 1 : 0;
  }
}

function buildPredictions() {
  const state = createInitialState();
  const rounds = [];

  for (let round = 1; round <= 7; round += 1) {
    const predicted = algorithmPairsForState(state, round);
    rounds.push({ round, predicted });
    applyPredictedRound(state, predicted);
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

function monradPairs(round) {
  const ordered = [...players].sort((a, b) => {
    const scoreDiff = scoreBefore(b, round) - scoreBefore(a, round);
    if (scoreDiff !== 0) return scoreDiff;
    const eloDiff = b.elo - a.elo;
    if (eloDiff !== 0) return eloDiff;
    return a.id - b.id;
  });

  return ordered.reduce((pairs, player, index) => {
    if (index % 2 === 0 && ordered[index + 1]) {
      pairs.push([player.id, ordered[index + 1].id]);
    }
    return pairs;
  }, []);
}

function localGroupHits(round) {
  if (round === 1) return { hits: 18, total: 18 };

  const ordered = [...players].sort((a, b) => {
    const scoreDiff = scoreBefore(b, round) - scoreBefore(a, round);
    if (scoreDiff !== 0) return scoreDiff;
    const eloDiff = b.elo - a.elo;
    if (eloDiff !== 0) return eloDiff;
    return a.id - b.id;
  });
  const groupIndex = new Map(ordered.map((player, index) => [player.id, Math.floor(index / 10)]));
  const pairs = actualPairs(round);
  const hits = pairs.filter(([a, b]) => groupIndex.get(a) === groupIndex.get(b)).length;
  return { hits, total: pairs.length };
}

function monradHits(round) {
  const actual = new Set(actualPairs(round).map(([a, b]) => pairKey(a, b)));
  const predicted = monradPairs(round).map(([a, b]) => pairKey(a, b));
  return predicted.filter((key) => actual.has(key)).length;
}

function comparableActualKeys(round) {
  const pairs = round === 1 ? actualPairs(round).slice(3) : actualPairs(round);
  return new Set(pairs.map(([a, b]) => pairKey(a, b)));
}

function matchStats(round, predicted) {
  const actual = comparableActualKeys(round);
  const matched = predicted.filter(([a, b]) => actual.has(pairKey(a, b))).length;
  return { matched, total: actual.size };
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
  return scoreAfter(player, 7);
}

const predictions = buildPredictions();

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
  const totalPairs = players.reduce((sum, player) => sum + player.rounds.length, 0) / 2;
  const modelTotal = predictions.reduce((sum, entry) => sum + matchStats(entry.round, entry.predicted).matched, 0);
  const modelPossible = predictions.reduce((sum, entry) => sum + matchStats(entry.round, entry.predicted).total, 0);
  const strongestOpponents = new Set(predictedOpponentIds(1)).size;
  const repeatedPairs = repeatedPredictedPairCount();

  document.querySelector("#metrics").innerHTML = [
    ["Spelare", players.length, "42 deltagare i fyra prisgrupper"],
    ["Ronder", 7, `${totalPairs} partier i filen`],
    ["Rond 1", 3, "toppbord används för state men räknas inte"],
    ["Algoritm", `${modelTotal}/${modelPossible}`, "träffar mot faktisk lottning"],
    ["Matchning", "Elo²", "minimerar kvadrerad eloskillnad"],
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
      Modellen använder bara spelarnas start-elo. Poäng och löpande selo-uppdatering ingår inte längre,
      vilket gör att alla sju ronder kan räknas fram direkt från tidigare predikterade möten och färghistorik.
      Prisgrupperna och de statiska 10-grupperna används inte som lottgränser.
    </p>
    <p>
      De tre första borden i rond 1 är låsta till filens lottning för att minska störningen från den
      manuella toppjusteringen, men räknas inte som modellträffar. Efter varje predikterad rond sparas
      motståndare och färger så att nästa rond kan spärras mot returmöten och otillåtna färgkombinationer.
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
      <li>Använd inte prisgrupper eller statiska 10-grupper som lottgränser.</li>
      <li>Lås de tre första borden i rond 1 till faktisk lottning i filen.</li>
      <li>För varje rond byggs alla möjliga par som inte redan har mötts.</li>
      <li>Par som bryter färgväxlingskravet tas bort.</li>
      <li>Varje återstående cell i Blossom-viktmatrisen får vikten eloskillnad gånger eloskillnad.</li>
      <li>En perfekt matchning med minsta totalvikt söks över hela fältet.</li>
      <li>Efter ronden sparas predikterade motståndare och färger; inga poäng eller elotal uppdateras.</li>
      <li>Godhetstalet visar både elo-medelavstånd och medelavstånd mellan spelarnas nya elo-sorterade matrisnummer.</li>
    </ol>
  `;
}

function renderRounds() {
  document.querySelector("#rounds").innerHTML = predictions.map(({ round, predicted }) => {
    const pairs = actualPairs(round);
    const stats = matchStats(round, predicted);
    const comment = round === 1
      ? "Tre första borden används men räknas inte som träffar."
      : "Elo-only-matchning utan poänguppdatering.";
    const hitClass = stats.matched >= Math.ceil(stats.total * 0.5) ? "ok" : "warn";

    return `
      <tr>
        <td>${round}</td>
        <td>${pairs.map(shortPair).join(", ")}</td>
        <td>${predicted.map(shortPair).join(", ")}</td>
        <td><span class="${hitClass}">${stats.matched}/${stats.total}</span></td>
        <td>${roundCost(predicted)}</td>
        <td>${comment}</td>
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
  return Array.from({ length: 7 }, (_, index) => ({
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
  const winner = predicted.meanEloDistance < actual.meanEloDistance
    ? "Blossom har lägre elo-medelavstånd"
    : "Faktisk lottning har lägre elo-medelavstånd";

  document.querySelector("#matrix-quality").innerHTML = [
    ["Faktisk", actual.meanEloDistance.toFixed(0), `elo i snitt, ${actual.meanDistance.toFixed(2)} matrissteg`],
    ["Blossom", predicted.meanEloDistance.toFixed(0), `elo i snitt, ${predicted.meanDistance.toFixed(2)} matrissteg`],
    ["Jämförelse", winner, `elo-skillnad ${(actual.meanEloDistance - predicted.meanEloDistance).toFixed(0)}`],
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
      <td>${player.rounds.map((token, index) => {
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
