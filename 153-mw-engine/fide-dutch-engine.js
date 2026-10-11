/* Derived from fide-dutch.htm by Mats Winther. Experimental Dutch pairing engine. */
"use strict";

// Synchronous, stateless API. No DOM, storage, workers, or external dependencies.

function Dutch2026Core() {
  const VERSION = "2026-reference-1";

  function fault(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function compareArrays(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return Math.sign(a.length - b.length);
  }

  function compareQuality(a, b) {
    for (let i = 0; i < a.length; i++) {
      const c = Array.isArray(a[i])
        ? compareArrays(a[i], b[i])
        : Math.sign(a[i] - b[i]);
      if (c) return c;
    }
    return 0;
  }

  function rank(a, b) {
    return b.score - a.score || a.tpn - b.tpn;
  }

  function colorDifference(player) {
    return player.playedColors.reduce(
      (sum, color) => sum + (color === "W" ? 1 : -1), 0
    );
  }

  function preference(player) {
    const h = player.playedColors;
    if (!h.length) {
      return { color:null, strength:0, type:"none" };
    }

    const cd = colorDifference(player);
    const last = h[h.length - 1];
    const two = h.length >= 2 && last === h[h.length - 2];

    const absoluteWhite = cd < -1 || (two && last === "B");
    const absoluteBlack = cd > 1 || (two && last === "W");

    if (absoluteWhite && absoluteBlack) {
      throw fault(
        "INPUT",
        "Conflicting absolute color requirements in the history of TPN " +
        player.tpn + ". Resolve the underlying tournament data."
      );
    }

    if (absoluteWhite) {
      return { color:"W", strength:3, type:"absolute" };
    }
    if (absoluteBlack) {
      return { color:"B", strength:3, type:"absolute" };
    }
    if (cd === 1) {
      return { color:"B", strength:2, type:"strong" };
    }
    if (cd === -1) {
      return { color:"W", strength:2, type:"strong" };
    }

    return {
      color:last === "W" ? "B" : "W",
      strength:1,
      type:"mild"
    };
  }

  function topscorer(player, context) {
    return context.roundNumber === context.totalRounds &&
      player.score >
        ((context.roundNumber - 1) * context.winPoints) / 2;
  }

  function compatible(a, b, context) {
    if (!a || !b || a.id === b.id) return false;
    if (a.opponents.includes(b.id) || b.opponents.includes(a.id)) {
      return false;
    }

    const pa = preference(a);
    const pb = preference(b);

    return !(
      !topscorer(a, context) &&
      !topscorer(b, context) &&
      pa.strength === 3 &&
      pb.strength === 3 &&
      pa.color === pb.color
    );
  }

  function allocate(a, b, initialColor) {
    const high = rank(a, b) <= 0 ? a : b;
    const low = high === a ? b : a;
    const hp = preference(high);
    const lp = preference(low);

    function give(player, color) {
      const other = player === high ? low : high;
      return color === "W"
        ? { white:player, black:other }
        : { white:other, black:player };
    }

    if (hp.color && lp.color && hp.color !== lp.color) {
      return give(high, hp.color);
    }

    if (hp.strength > lp.strength) return give(high, hp.color);
    if (lp.strength > hp.strength) return give(low, lp.color);

    if (hp.strength === 3 && lp.strength === 3) {
      const hd = Math.abs(colorDifference(high));
      const ld = Math.abs(colorDifference(low));
      if (hd > ld) return give(high, hp.color);
      if (ld > hd) return give(low, lp.color);
    }

    const hh = high.playedColors;
    const lh = low.playedColors;

    for (let back = 1; back <= Math.min(hh.length, lh.length); back++) {
      const hc = hh[hh.length - back];
      const lc = lh[lh.length - back];
      if (hc !== lc) {
        return give(high, hc === "W" ? "B" : "W");
      }
    }

    if (hp.color) return give(high, hp.color);
    if (lp.color) return give(low, lp.color);

    const color = high.tpn % 2
      ? initialColor
      : (initialColor === "W" ? "B" : "W");

    return give(high, color);
  }

  function solve(input, limits = {}, progress = () => {}) {
    const started = performance.now();
    const seconds = Number(limits.seconds ?? 30);
    const nodeLimit = Number(limits.nodes ?? 2000000);
    const deadline = seconds > 0
      ? started + seconds * 1000
      : Infinity;

    if (
      !Number.isFinite(seconds) || seconds < 0 ||
      !Number.isSafeInteger(nodeLimit) || nodeLimit < 0
    ) {
      throw fault("INPUT", "Invalid search limits.");
    }

    let nodes = 0;
    let phase = "Preparing pairing data";
    let lastProgress = started;

    function tick() {
      nodes++;

      if (nodeLimit > 0 && nodes > nodeLimit) {
        throw fault("LIMIT", "The search work limit was reached.");
      }

      if ((nodes & 255) === 0 || nodes === 1) {
        const now = performance.now();

        if (now >= deadline) {
          throw fault("LIMIT", "The search time limit was reached.");
        }

        if (now - lastProgress >= 200) {
          progress({ phase, nodes, elapsedMs:now - started });
          lastProgress = now;
        }
      }
    }

    const context = {
      roundNumber:Number(input.roundNumber),
      totalRounds:Number(input.totalRounds),
      winPoints:Number(input.winPoints),
      initialColor:input.initialColor
    };

    if (
      !Number.isInteger(context.roundNumber) ||
      !Number.isInteger(context.totalRounds) ||
      context.roundNumber < 1 ||
      context.roundNumber > context.totalRounds ||
      ![1,3].includes(context.winPoints) ||
      !["W","B"].includes(context.initialColor) ||
      !Array.isArray(input.players)
    ) {
      throw fault("INPUT", "Invalid pairing context.");
    }

    if (input.acceleration || (input.restrictions || []).length) {
      throw fault(
        "INPUT",
        "Acceleration and extra restrictions are unsupported."
      );
    }

    const completed = context.roundNumber - 1;
    const seenIds = new Set();
    const seenTPNs = new Set();

    const players = input.players.map(raw => {
      tick();

      const p = {
        id:String(raw.id),
        tpn:Number(raw.tpn),
        score:Number(raw.score),
        opponents:[...(raw.opponents || [])],
        playedColors:[...(raw.playedColors || [])],
        floats:[...(raw.floats || [])],
        hadPAB:Boolean(raw.hadPAB),
        hadUnplayedWin:Boolean(raw.hadUnplayedWin)
      };

      if (
        !p.id || seenIds.has(p.id) ||
        !Number.isSafeInteger(p.tpn) ||
        p.tpn < 1 || seenTPNs.has(p.tpn) ||
        !Number.isFinite(p.score) || p.score < 0 ||
        !Number.isInteger(p.score * 2) ||
        p.score > completed * context.winPoints ||
        p.playedColors.length > completed ||
        p.playedColors.some(c => c !== "W" && c !== "B") ||
        p.floats.length !== completed ||
        p.floats.some(f => !["-","D","U"].includes(f))
      ) {
        throw fault(
          "INPUT",
          "Invalid state for a player, including TPN " + p.tpn + "."
        );
      }

      seenIds.add(p.id);
      seenTPNs.add(p.tpn);
      p.unplayedCount = completed - p.playedColors.length;
      p.pref = preference(p);
      p.cd = colorDifference(p);
      p.top = topscorer(p, context);

      return p;
    }).sort(rank);

    const N = players.length;
    const ids = players.map((_, i) => i);
    const eligible = i =>
      !players[i].hadPAB && !players[i].hadUnplayedWin;

    const numericSort = (a, b) => a - b;
    const ordered = xs => [...xs].sort(numericSort);
    const keyOf = xs => ordered(xs).join(",");
    const scoreList = xs =>
      xs.map(i => players[i].score).sort((a,b) => b-a);
    const previous = (i, back) =>
      players[i].floats[completed - back] || "-";

    const edge = Array.from(
      {length:N}, () => new Array(N).fill(false)
    );
    const colors = Array.from({length:N}, () => new Array(N));
    const pairCost = Array.from({length:N}, () => new Array(N));

    const allScores = players.map(p => p.score);
    const REFLOAT = N
      ? Math.max(...allScores) - Math.min(...allScores) + 1
      : 1;

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        tick();

        const a = players[i];
        const b = players[j];
        edge[i][j] = edge[j][i] = compatible(a, b, context);

        const allocation = allocate(a, b, context.initialColor);
        const wi = allocation.white === a ? i : j;
        const bi = wi === i ? j : i;
        colors[i][j] = colors[j][i] = [wi, bi];

        const cost = [0,0,0,0];

        for (const [pi, color] of [[wi,"W"],[bi,"B"]]) {
          const p = players[pi];

          if (p.pref.color && p.pref.color !== color) {
            cost[2]++;
            if (p.pref.strength === 2) cost[3]++;
          }

          if (a.top || b.top) {
            if (Math.abs(p.cd + (color === "W" ? 1 : -1)) > 2) {
              cost[0]++;
            }

            const h = p.playedColors;
            if (
              h.length >= 2 &&
              h[h.length-1] === color &&
              h[h.length-2] === color
            ) {
              cost[1]++;
            }
          }
        }

        pairCost[i][j] = pairCost[j][i] = cost;
      }
    }

    const matchingMemo = new Map();

    function perfectMatching(list, restricted = new Set()) {
      function visit(xs) {
        tick();
        if (!xs.length) return true;
        if (xs.length % 2) return false;

        const key = xs.join(",") + "/" +
          xs.filter(i => restricted.has(i)).join(",");

        if (matchingMemo.has(key)) {
          return matchingMemo.get(key);
        }

        let chosen = -1;
        let opponents = null;

        for (const i of xs) {
          tick();

          const possible = xs.filter(j =>
            i !== j &&
            edge[i][j] &&
            !(restricted.has(i) && restricted.has(j))
          );

          if (!possible.length) {
            matchingMemo.set(key, false);
            return false;
          }

          if (
            opponents === null ||
            possible.length < opponents.length
          ) {
            chosen = i;
            opponents = possible;
          }
        }

        for (const j of opponents) {
          if (visit(xs.filter(i => i !== chosen && i !== j))) {
            matchingMemo.set(key, true);
            return true;
          }
        }

        matchingMemo.set(key, false);
        return false;
      }

      return visit(ordered(list));
    }

    phase = "Establishing C4 and the minimum feasible bye score";
    let byeScore = null;

    if (N % 2) {
      const possibleScores = [...new Set(
        ids.filter(eligible).map(i => players[i].score)
      )].sort((a,b) => a-b);

      outer:
      for (const score of possibleScores) {
        for (const i of ids) {
          tick();

          if (
            eligible(i) &&
            players[i].score === score &&
            perfectMatching(ids.filter(j => j !== i))
          ) {
            byeScore = score;
            break outer;
          }
        }
      }

      if (byeScore === null) {
        throw fault(
          "NO_LEGAL_COMPLETION",
          "No complete round satisfying C1–C3 and bye eligibility exists."
        );
      }
    } else if (!perfectMatching(ids)) {
      throw fault(
        "NO_LEGAL_COMPLETION",
        "No complete round satisfying C1–C3 exists."
      );
    }

    const completionMemo = new Map();

    function canComplete(list) {
      const xs = ordered(list);
      const key = xs.join(",");

      if (completionMemo.has(key)) {
        return completionMemo.get(key);
      }

      let answer = false;

      if (!(xs.length % 2)) {
        answer = perfectMatching(xs);
      } else if (byeScore !== null) {
        for (const i of xs) {
          tick();

          if (
            eligible(i) &&
            players[i].score === byeScore &&
            perfectMatching(xs.filter(j => j !== i))
          ) {
            answer = true;
            break;
          }
        }
      }

      completionMemo.set(key, answer);
      return answer;
    }

    const groups = [];

    for (const i of ids) {
      const score = players[i].score;
      const last = groups[groups.length-1];

      if (!last || last.score !== score) {
        groups.push({score, ids:[i]});
      } else {
        last.ids.push(i);
      }
    }

    const tails = new Array(groups.length + 1);
    tails[groups.length] = [];

    for (let i = groups.length - 1; i >= 0; i--) {
      tails[i] = [...groups[i].ids, ...tails[i+1]];
    }

    const contexts = new Map();
    const highMemo = new Map();
    const feasibleMemo = new Map();

    function bracketContext(index, incoming) {
      const mdps = ordered(incoming);
      const key = index + ":" + mdps.join(",");

      if (contexts.has(key)) return contexts.get(key);

      const residents = groups[index].ids;
      const value = {
        key,
        index,
        score:groups[index].score,
        mdps,
        mdpSet:new Set(mdps),
        residents,
        all:ordered([...mdps, ...residents]),
        lower:tails[index+1],
        last:index === groups.length - 1
      };

      contexts.set(key, value);
      return value;
    }

    function* combinations(items, count, start = 0, chosen = []) {
      tick();

      if (count === 0) {
        yield [...chosen];
        return;
      }

      for (let i = start; i <= items.length - count; i++) {
        chosen.push(items[i]);
        yield* combinations(items, count-1, i+1, chosen);
        chosen.pop();
      }
    }

    function groupedScores(list) {
      const result = [];

      for (const i of ordered(list)) {
        const score = players[i].score;
        const last = result[result.length-1];

        if (!last || last.score !== score) {
          result.push({score, ids:[i]});
        } else {
          last.ids.push(i);
        }
      }

      return result;
    }

    function* scoreProfiles(list, count) {
      const gs = groupedScores(list);
      const remaining = new Array(gs.length + 1).fill(0);

      for (let i = gs.length - 1; i >= 0; i--) {
        remaining[i] = remaining[i+1] + gs[i].ids.length;
      }

      function* visit(index, needed, profile) {
        tick();

        if (index === gs.length) {
          if (needed === 0) yield profile;
          return;
        }

        const minimum = Math.max(0, needed - remaining[index+1]);
        const maximum = Math.min(needed, gs[index].ids.length);

        for (let take = minimum; take <= maximum; take++) {
          yield* visit(
            index+1,
            needed-take,
            [...profile, ...new Array(take).fill(gs[index].score)]
          );
        }
      }

      yield* visit(0, count, []);
    }

    function* setsWithScores(list, profile) {
      const gs = groupedScores(list);
      const counts = new Map();

      for (const score of profile) {
        counts.set(score, (counts.get(score) || 0) + 1);
      }

      function* visit(index, chosen) {
        tick();

        if (index === gs.length) {
          yield chosen;
          return;
        }

        const count = counts.get(gs[index].score) || 0;

        for (const part of combinations(gs[index].ids, count)) {
          yield* visit(index+1, [...chosen, ...part]);
        }
      }

      yield* visit(0, []);
    }

    function futureOK(ctx, down) {
      if (ctx.last) {
        if (N % 2) {
          return down.length === 1 &&
            eligible(down[0]) &&
            players[down[0]].score === byeScore;
        }
        return down.length === 0;
      }

      return canComplete([...down, ...ctx.lower]);
    }

    function feasibleDownset(ctx, down) {
      const key = ctx.key + "|" + keyOf(down);

      if (feasibleMemo.has(key)) {
        return feasibleMemo.get(key);
      }

      const downSet = new Set(down);
      const paired = ctx.all.filter(i => !downSet.has(i));
      const answer = futureOK(ctx, down) &&
        perfectMatching(paired, ctx.mdpSet);

      feasibleMemo.set(key, answer);
      return answer;
    }

    function compareHigh(a, b) {
      return a.count - b.count ||
        compareArrays(a.scores, b.scores);
    }

    function theoreticalHigh(ctx) {
      const pairs = Math.min(
        Math.floor(ctx.all.length/2),
        ctx.residents.length
      );
      const count = ctx.all.length - 2*pairs;
      const scores = ctx.all
        .map(i => players[i].score)
        .sort((a,b) => a-b)
        .slice(0,count)
        .sort((a,b) => b-a);

      return {count, scores};
    }

    function highFor(index, incoming) {
      const ctx = bracketContext(index, incoming);

      if (highMemo.has(ctx.key)) return highMemo.get(ctx.key);

      const lowerBound = theoreticalHigh(ctx);

      for (
        let count = lowerBound.count;
        count <= ctx.all.length;
        count += 2
      ) {
        if (ctx.last && count !== N % 2) continue;

        for (const profile of scoreProfiles(ctx.all, count)) {
          for (const down of setsWithScores(ctx.all, profile)) {
            if (!feasibleDownset(ctx, down)) continue;

            const limboCount = down.filter(
              i => ctx.mdpSet.has(i)
            ).length;

            const high = {
              count,
              scores:profile,
              pairs:(ctx.all.length-count)/2,
              m1:ctx.mdps.length-limboCount,
              exampleDown:down
            };

            highMemo.set(ctx.key, high);
            return high;
          }
        }
      }

      highMemo.set(ctx.key, null);
      return null;
    }

    function bestLookAhead(ctx, high) {
      if (ctx.last) return {count:0, scores:[]};

      const nextBound = theoreticalHigh(
        bracketContext(ctx.index+1, high.exampleDown)
      );

      let best = null;

      for (const down of setsWithScores(ctx.all, high.scores)) {
        if (!feasibleDownset(ctx, down)) continue;

        const next = highFor(ctx.index+1, down);
        if (!next) continue;

        if (!best || compareHigh(next, best) < 0) {
          best = {count:next.count, scores:next.scores};
        }

        if (compareHigh(best, nextBound) === 0) break;
      }

      if (!best) {
        throw fault(
          "NO_DUTCH_CANDIDATE",
          "No next-bracket candidate was established. " +
          "No pairing is being returned."
        );
      }

      return best;
    }

    function matchesLookAhead(ctx, down, lookAhead) {
      if (ctx.last) return true;

      const next = highFor(ctx.index+1, down);
      return next !== null && compareHigh(next, lookAhead) === 0;
    }

    function c9Applies(high) {
      return byeScore !== null &&
        high.count === 1 &&
        high.scores[0] === byeScore;
    }

    function bestC9(ctx, high, lookAhead) {
      if (!c9Applies(high)) return 0;

      let best = Infinity;

      for (const down of setsWithScores(ctx.all, high.scores)) {
        if (
          feasibleDownset(ctx, down) &&
          matchesLookAhead(ctx, down, lookAhead)
        ) {
          best = Math.min(
            best,
            players[down[0]].unplayedCount
          );

          if (best === 0) break;
        }
      }

      if (!Number.isFinite(best)) {
        throw fault(
          "NO_DUTCH_CANDIDATE",
          "No C9-compatible candidate was established."
        );
      }

      return best;
    }

    function* sumCombinations(
      items, count, target, start = 0, chosen = []
    ) {
      tick();

      if (count === 0) {
        if (target === 0) yield [...chosen];
        return;
      }

      if (items.length-start < count) return;

      let minimum = 0;
      let maximum = 0;

      for (let k = 0; k < count; k++) {
        minimum += items[start+k];
        maximum += items[items.length-1-k];
      }

      if (target < minimum || target > maximum) return;

      for (let i = start; i <= items.length-count; i++) {
        chosen.push(items[i]);

        yield* sumCombinations(
          items, count-1, target-items[i], i+1, chosen
        );

        chosen.pop();
      }
    }

    function* exchangeConfigurations(list, pairCount) {
      const n = list.length;
      const A = Array.from({length:pairCount}, (_,i) => i+1);
      const B = Array.from(
        {length:n-pairCount}, (_,i) => pairCount+i+1
      );

      yield {
        s1:list.slice(0,pairCount),
        s2:list.slice(pairCount)
      };

      for (
        let size = 1;
        size <= Math.min(A.length,B.length);
        size++
      ) {
        for (
          let difference = size*size;
          difference <= size*(n-size);
          difference++
        ) {
          for (const outgoing of combinations([...A].reverse(), size)) {
            const sum = outgoing.reduce((a,b) => a+b,0);

            for (const incoming of sumCombinations(B,size,sum+difference)) {
              tick();

              const outSet = new Set(outgoing);
              const inSet = new Set(incoming);

              const s1 = [
                ...A.filter(x => !outSet.has(x)),
                ...incoming
              ].sort(numericSort).map(x => list[x-1]);

              const s2 = [
                ...B.filter(x => !inSet.has(x)),
                ...outgoing
              ].sort(numericSort).map(x => list[x-1]);

              yield {s1,s2};
            }
          }
        }
      }
    }

    function* prefixPairings(
      s1, s2, canWin, position = 0, used = new Set(), pairs = []
    ) {
      tick();
      if (!canWin(pairs)) return;

      if (position === s1.length) {
        yield {
          pairs:[...pairs],
          unused:s2.filter(i => !used.has(i))
        };
        return;
      }

      const first = s1[position];

      for (const second of s2) {
        if (used.has(second) || !edge[first][second]) continue;

        used.add(second);
        pairs.push([first,second]);

        yield* prefixPairings(
          s1,s2,canWin,position+1,used,pairs
        );

        pairs.pop();
        used.delete(second);
      }
    }

    function* homogeneousCandidates(list, pairCount, canWin) {
      const sorted = ordered(list);

      if (pairCount === 0) {
        yield {pairs:[], down:sorted};
        return;
      }

      for (const config of exchangeConfigurations(sorted,pairCount)) {
        for (const candidate of prefixPairings(
          config.s1,config.s2,canWin
        )) {
          yield {
            pairs:candidate.pairs,
            down:ordered(candidate.unused)
          };
        }
      }
    }

    function* bracketCandidates(ctx, high, canWin) {
      if (!ctx.mdps.length) {
        yield* homogeneousCandidates(
          ctx.residents,high.pairs,canWin
        );
        return;
      }

      const requiredLimboScores = high.scores.filter(
        score => score > ctx.score
      );

      for (const selected of combinations(ctx.mdps, high.m1)) {
        const selectedSet = new Set(selected);
        const limbo = ctx.mdps.filter(i => !selectedSet.has(i));

        if (compareArrays(scoreList(limbo),requiredLimboScores)) {
          continue;
        }

        for (const mdpPairing of prefixPairings(
          selected,ctx.residents,canWin
        )) {
          const remainderCanWin = pairs =>
            canWin([...mdpPairing.pairs,...pairs]);

          for (const remainder of homogeneousCandidates(
            mdpPairing.unused,
            high.pairs-high.m1,
            remainderCanWin
          )) {
            yield {
              pairs:[...mdpPairing.pairs,...remainder.pairs],
              down:ordered([...limbo,...remainder.down])
            };
          }
        }
      }
    }

    function quality(ctx, candidate) {
      const v = [0,0,0,0,0,0,0,0,[],[],[],[]];
      const mates = new Map();

      for (const [a,b] of candidate.pairs) {
        const pc = pairCost[a][b];

        for (let k = 0; k < 4; k++) v[k] += pc[k];

        mates.set(a,b);
        mates.set(b,a);

        let resident = null;
        let mdp = null;

        if (ctx.mdpSet.has(a)) {
          mdp = a;
          resident = b;
        } else if (ctx.mdpSet.has(b)) {
          mdp = b;
          resident = a;
        }

        if (mdp !== null) {
          const gap = players[mdp].score-players[resident].score;

          if (previous(resident,1) === "U") {
            v[5]++;
            v[9].push(gap);
          }

          if (previous(resident,2) === "U") {
            v[7]++;
            v[11].push(gap);
          }
        }
      }

      for (const i of candidate.down) {
        if (ctx.mdpSet.has(i)) continue;
        if (previous(i,1) === "D") v[4]++;
        if (previous(i,2) === "D") v[6]++;
      }

      for (const i of ctx.mdps) {
        const gap = mates.has(i)
          ? players[i].score-players[mates.get(i)].score
          : REFLOAT;

        if (previous(i,1) === "D") v[8].push(gap);
        if (previous(i,2) === "D") v[10].push(gap);
      }

      for (let k = 8; k < 12; k++) {
        v[k].sort((a,b) => b-a);
      }

      return v;
    }

    function qualityLowerBound(ctx, high) {
      const pairs = high.pairs;
      const down = high.count;
      const r = ctx.residents.length;
      const limboCount = ctx.mdps.length-high.m1;
      const residentDown = down-limboCount;

      const countPreference = (color, strongOnly) =>
        ctx.all.filter(i =>
          players[i].pref.color === color &&
          (!strongOnly || players[i].pref.strength === 2)
        ).length;

      const colorBound = strongOnly =>
        Math.max(0,countPreference("W",strongOnly)-pairs-down) +
        Math.max(0,countPreference("B",strongOnly)-pairs-down);

      const residentHistoryCount = (marker, back) =>
        ctx.residents.filter(
          i => previous(i,back) === marker
        ).length;

      const d1 = Math.max(
        0,residentDown-(r-residentHistoryCount("D",1))
      );
      const u1 = Math.max(
        0,high.m1-(r-residentHistoryCount("U",1))
      );
      const d2 = Math.max(
        0,residentDown-(r-residentHistoryCount("D",2))
      );
      const u2 = Math.max(
        0,high.m1-(r-residentHistoryCount("U",2))
      );

      const limboByScore = new Map();

      for (const score of high.scores) {
        if (score > ctx.score) {
          limboByScore.set(
            score,(limboByScore.get(score)||0)+1
          );
        }
      }

      function mdpBound(back) {
        const result = [];

        for (const group of groupedScores(ctx.mdps)) {
          const protectedCount = group.ids.filter(
            i => previous(i,back) === "D"
          ).length;

          const limbo = limboByScore.get(group.score) || 0;
          const forcedProtectedLimbo = Math.max(
            0,limbo-(group.ids.length-protectedCount)
          );

          result.push(
            ...new Array(forcedProtectedLimbo).fill(REFLOAT)
          );
          result.push(
            ...new Array(protectedCount-forcedProtectedLimbo)
              .fill(group.score-ctx.score)
          );
        }

        return result.sort((a,b) => b-a);
      }

      const pairedMdpGaps = [];

      for (const group of groupedScores(ctx.mdps)) {
        const count = group.ids.length -
          (limboByScore.get(group.score)||0);

        pairedMdpGaps.push(
          ...new Array(count).fill(group.score-ctx.score)
        );
      }

      pairedMdpGaps.sort((a,b) => a-b);

      return [
        0,0,colorBound(false),colorBound(true),
        d1,u1,d2,u2,
        mdpBound(1),
        pairedMdpGaps.slice(0,u1).sort((a,b) => b-a),
        mdpBound(2),
        pairedMdpGaps.slice(0,u2).sort((a,b) => b-a)
      ];
    }

    function selectBracket(index, incoming) {
      const ctx = bracketContext(index,incoming);
      phase = "Optimizing bracket at score " + ctx.score;

      const high = highFor(index,incoming);

      if (!high) {
        throw fault(
          "NO_DUTCH_CANDIDATE",
          "No bracket candidate was established at score " +
          ctx.score + "."
        );
      }

      const lookAhead = bestLookAhead(ctx,high);
      const c9 = bestC9(ctx,high,lookAhead);
      const lowerBound = qualityLowerBound(ctx,high);
      const acceptableMemo = new Map();

      function acceptableDown(down) {
        const key = keyOf(down);

        if (acceptableMemo.has(key)) {
          return acceptableMemo.get(key);
        }

        const answer =
          down.length === high.count &&
          compareArrays(scoreList(down),high.scores) === 0 &&
          feasibleDownset(ctx,down) &&
          matchesLookAhead(ctx,down,lookAhead) &&
          (
            !c9Applies(high) ||
            players[down[0]].unplayedCount === c9
          );

        acceptableMemo.set(key,answer);
        return answer;
      }

      let best = null;
      let ordinal = 0;
      let cap = null;
      let proof = "exhausted-with-safe-pruning";

      function canWin(partialPairs) {
        const limit = best ? best.value.slice(0,4) : cap;
        if (!limit) return true;

        const partial = [0,0,0,0];

        for (const [a,b] of partialPairs) {
          for (let k = 0; k < 4; k++) {
            partial[k] += pairCost[a][b][k];
          }
        }

        return compareArrays(partial,limit) <= 0;
      }

      // Optimistic passes first. Relax the cap only if nothing is found.
      const caps = [
        [lowerBound[0],lowerBound[1],lowerBound[2],Infinity],
        [lowerBound[0],lowerBound[1],lowerBound[2]+1,Infinity],
        null                       // original behaviour as last resort
      ];

      for (const c of caps) {
        cap = c;

        for (const candidate of bracketCandidates(ctx,high,canWin)) {
          tick();
          ordinal++;

          if (!acceptableDown(candidate.down)) continue;

          const value = quality(ctx,candidate);

          if (!best || compareQuality(value,best.value) < 0) {
            best = {...candidate,value,ordinal};
          }

          if (compareQuality(best.value,lowerBound) === 0) {
            proof = "lower-bound-attained";
            break;
          }
        }

        if (best) break;
      }

      if (!best) {
        throw fault(
          "NO_DUTCH_CANDIDATE",
          "No selectable candidate was established at score " +
          ctx.score + "."
        );
      }

      const qualityNames = [
        "C10","C11","C12","C13","C14","C15","C16","C17",
        "C18","C19","C20","C21"
      ];

      const evaluated = {};

      qualityNames.forEach((name,k) => {
        evaluated[name] = Array.isArray(best.value[k])
          ? best.value[k].map(x => x === REFLOAT ? "REFLOAT" : x)
          : best.value[k];
      });

      return {
        ...best,
        trace:{
          score:ctx.score,
          incomingMDPs:ctx.mdps.map(i => players[i].tpn),
          MaxPairs:high.pairs,
          M0:ctx.mdps.length,
          M1:high.m1,
          C5:byeScore,
          C6:high.count,
          C7:high.scores,
          C8:{
            nextDownfloaters:lookAhead.count,
            nextDownfloaterScores:lookAhead.scores
          },
          C9:c9Applies(high) ? c9 : "not applicable",
          ...evaluated,
          downfloaters:best.down.map(i => players[i].tpn),
          selectedGeneratedCandidate:best.ordinal,
          proof
        }
      };
    }

    const allPairs = [];
    const trace = [];
    let incoming = [];

    for (let index = 0; index < groups.length; index++) {
      const selected = selectBracket(index,incoming);
      allPairs.push(...selected.pairs);
      trace.push(selected.trace);
      incoming = selected.down;
    }

    if (incoming.length !== N % 2) {
      throw fault("INTERNAL","Final coverage check failed.");
    }

    const pabIndex = incoming.length ? incoming[0] : null;

    if (
      pabIndex !== null &&
      (
        !eligible(pabIndex) ||
        players[pabIndex].score !== byeScore
      )
    ) {
      throw fault("INTERNAL","Final bye check failed.");
    }

    const covered = new Set();
    const outputPairs = [];

    for (const [a,b] of allPairs) {
      if (!edge[a][b] || covered.has(a) || covered.has(b)) {
        throw fault(
          "INTERNAL",
          "Final pair legality or uniqueness check failed."
        );
      }

      covered.add(a);
      covered.add(b);

      const [w,bl] = colors[a][b];

      outputPairs.push({
        whiteId:players[w].id,
        blackId:players[bl].id
      });
    }

    if (pabIndex !== null) {
      if (covered.has(pabIndex)) {
        throw fault("INTERNAL","Duplicate bye recipient.");
      }
      covered.add(pabIndex);
    }

    if (covered.size !== N) {
      throw fault("INTERNAL","Incomplete player coverage.");
    }

    return {
      engineVersion:VERSION,
      pairs:outputPairs,
      pabId:pabIndex === null ? null : players[pabIndex].id,
      byeScore,
      trace,
      stats:{
        nodes,
        elapsedMs:performance.now()-started
      }
    };
  }

  function selfTest(progress = () => {}) {
    const results = [];

    function check(condition,message) {
      if (!condition) throw new Error(message);
    }

    function test(name,fn) {
      progress({phase:"Test: "+name,nodes:0,elapsedMs:0});
      fn();
      results.push(name);
    }

    function fixture(count,roundNumber = 1,totalRounds = 5) {
      const m = roundNumber-1;

      return {
        roundNumber,totalRounds,winPoints:1,initialColor:"W",
        players:Array.from({length:count},(_,i) => ({
          id:"P"+(i+1),
          tpn:i+1,
          score:0,
          opponents:[],
          playedColors:Array.from(
            {length:m},(_,r) => (r+i)%2 ? "B" : "W"
          ),
          floats:new Array(m).fill("-"),
          hadPAB:false,
          hadUnplayedWin:false
        }))
      };
    }

    function run(input,limits = {seconds:10,nodes:1000000}) {
      return solve(input,limits);
    }

    function opponents(result) {
      return result.pairs.map(p =>
        [p.whiteId,p.blackId].sort().join("-")
      ).sort();
    }

    test("Ordinary odd first round",() => {
      const result = run(fixture(15));

      check(result.pabId === "P15","Expected TPN 15 to receive the bye.");

      for (let i = 1; i <= 7; i++) {
        check(
          result.pairs.some(p =>
            [p.whiteId,p.blackId].includes("P"+i) &&
            [p.whiteId,p.blackId].includes("P"+(i+7))
          ),
          "Incorrect first-round opponent."
        );
      }

      check(
        result.pairs.some(p =>
          p.whiteId === "P1" && p.blackId === "P8"
        ),
        "Incorrect first-round initial color."
      );

      check(
        result.pairs.some(p =>
          p.whiteId === "P9" && p.blackId === "P2"
        ),
        "Incorrect even-TPN initial color."
      );
    });

    test("Canonical tie order",() => {
      const input = fixture(4,3,5);

      input.players.forEach(p => {
        p.score = 1;
        p.playedColors = ["W","B"];
      });

      const result = run(input);

      check(
        JSON.stringify(opponents(result)) ===
          JSON.stringify(["P1-P3","P2-P4"]),
        "Expected the natural top-half/bottom-half candidate."
      );
    });

    test("Played histories aligned from the end",() => {
      const a = {
        id:"A",tpn:1,score:2,playedColors:["W","W","B"]
      };
      const b = {
        id:"B",tpn:2,score:2,playedColors:["W","B","W"]
      };

      check(
        allocate(a,b,"W").white.id === "A",
        "Color allocation used the wrong historical alignment."
      );
    });

    test("C3 is absolute outside the topscorer exception",() => {
      const input = fixture(2,3,4);

      input.players.forEach(p => {
        p.score = 2;
        p.playedColors = ["W","W"];
      });

      let refused = false;

      try {
        run(input);
      } catch (error) {
        refused = error.code === "NO_LEGAL_COMPLETION";
      }

      check(
        refused,
        "Same absolute preferences should prohibit this pairing."
      );

      input.totalRounds = 3;

      check(
        run(input).pairs.length === 1,
        "Final-round topscorer exception failed."
      );
    });

    test("C4 can require extra downfloaters",() => {
      const input = fixture(4,2,5);
      input.players[0].score = 1;
      input.players[1].score = 1;
      input.players[2].opponents = ["P4"];
      input.players[3].opponents = ["P3"];

      const result = run(input);

      check(
        result.trace[0].MaxPairs === 0,
        "The upper bracket must leave both players available."
      );
      check(
        result.pairs.length === 2,
        "Expected complete cross-score pairing."
      );
    });

    test("C5 chooses the minimum feasible score",() => {
      const input = fixture(3,2,5);
      input.players[0].score = 1;
      input.players[2].score = 1;
      input.players[0].opponents = ["P3"];
      input.players[1].opponents = ["P3"];
      input.players[2].opponents = ["P1","P2"];

      const result = run(input);

      check(
        result.pabId === "P3" && result.byeScore === 1,
        "Incorrect feasible bye-score selection."
      );
    });

    test("C9 protects a player with fewer played games",() => {
      const input = fixture(3,2,5);
      input.players[2].playedColors = [];

      check(
        run(input).pabId === "P2",
        "Expected TPN 2, not previously absent TPN 3, to receive the bye."
      );
    });

    test("C8 optimizes the next bracket before current colors",() => {
      const input = fixture(8,3,6);

      input.players.forEach((p,i) => {
        p.score = i < 3 ? 2 : i < 6 ? 1 : 0;
        p.playedColors = ["W","B"];
      });

      input.players[3].opponents = ["P2","P3","P5","P6"];

      for (const i of [1,2,4,5]) {
        input.players[i].opponents.push("P4");
      }

      const result = run(input);

      check(
        JSON.stringify(result.trace[0].downfloaters) ===
          JSON.stringify([1]),
        "Expected TPN 1 to solve the next bracket's incompatibility."
      );
    });

    test("C18 protects an incoming MDP against Limbo/PAB",() => {
      const input = fixture(3,3,5);
      input.players[0].score = input.players[1].score = 2;
      input.players[0].playedColors = ["B","B"];
      input.players[1].playedColors = ["B","B"];
      input.players[1].floats[1] = "D";
      input.players[2].score = 1;
      input.players[2].playedColors = [];
      input.players[2].hadPAB = true;

      check(
        run(input).pabId === "P1",
        "The protected MDP should be paired rather than refloated to the bye."
      );
    });

    test("Resource interruption returns no provisional solution",() => {
      let stopped = false;

      try {
        run(fixture(8),{seconds:0,nodes:1});
      } catch (error) {
        stopped = error.code === "LIMIT";
      }

      check(stopped,"Expected a resource-limit exception.");
    });

    return {passed:results.length,tests:results};
  }

  return {
    VERSION,
    solve,
    selfTest,
    rank,
    preference,
    colorDifference,
    compatible,
    allocate
  };
}

const Core = Dutch2026Core();

const TITLE_WEIGHTS = {
  GM:8,IM:7,WGM:6,FM:5,WIM:4,CM:3,WFM:2,WCM:1,"":0
};

const STATUSES = [
  "pair","unplayed-zero","unplayed-draw","unplayed-win"
];

const RESULTS = [
  "1-0","0.5-0.5","0-1","1-0F","0-1F","0-0F"
];

const PLAYED_RESULTS = new Set([
  "1-0","0.5-0.5","0-1"
]);

function emptyTournament() {
  return {
    formatVersion:4,
    engineVersion:Core.VERSION,
    name:"FIDE Swiss Open 2026",
    totalRounds:5,
    initialColor:"W",
    winPoints:1,
    drawPoints:.5,
    lossPoints:0,
    pabPoints:1,
    settingsFrozen:false,
    listClosed:false,
    highestPairedRound:0,
    currentRound:0,
    players:[],
    rounds:[],
    activePairings:[],
    activeAudit:null
  };
}

function numberValue(
  value,label,minimum,maximum,integer = false
) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(label + " is required.");
  }

  const n = Number(value);

  if (
    !Number.isFinite(n) ||
    n < minimum ||
    n > maximum ||
    (integer && !Number.isSafeInteger(n))
  ) {
    throw new Error("Invalid " + label + ".");
  }

  return n;
}

function halfPointValue(value,label,maximum) {
  const n = numberValue(value,label,0,maximum);

  if (!Number.isInteger(n*2)) {
    throw new Error(label + " must use half-point increments.");
  }

  return n;
}

function titleValue(value) {
  const title = String(value || "").trim().toUpperCase();

  if (!Object.hasOwn(TITLE_WEIGHTS,title)) {
    throw new Error("Unknown FIDE title: " + title);
  }

  return title;
}

function assignTPNs(t = undefined) {
  const collator = new Intl.Collator(
    "en",{sensitivity:"base"}
  );

  t.players.sort((a,b) =>
    b.rating-a.rating ||
    TITLE_WEIGHTS[b.title]-TITLE_WEIGHTS[a.title] ||
    collator.compare(a.name,b.name) ||
    a.registrationOrder-b.registrationOrder
  );

  t.players.forEach((p,i) => {
    p.tpn = i+1;
  });
}

function tournamentStarted(t = undefined) {
  return (
    t.highestPairedRound > 0 ||
    t.rounds.length > 0 ||
    t.activePairings.length > 0
  );
}

function resultPoints(result,t = undefined) {
  if (result === "1-0" || result === "1-0F") {
    return [t.winPoints,t.lossPoints];
  }
  if (result === "0-1" || result === "0-1F") {
    return [t.lossPoints,t.winPoints];
  }
  if (result === "0.5-0.5") {
    return [t.drawPoints,t.drawPoints];
  }
  if (result === "0-0F") {
    return [t.lossPoints,t.lossPoints];
  }

  throw new Error("Unrecognized completed result: " + result);
}

function rebuildState(t = undefined) {
  const m = t.rounds.length;
  const map = new Map();

  for (const p of t.players) {
    p.score = 0;
    p.opponents = [];
    p.playedColors = [];
    p.roundColors = new Array(m).fill("-");
    p.floats = new Array(m).fill("-");
    p.hadPAB = false;
    p.hadUnplayedWin = false;
    p.unplayedCount = m;
    map.set(p.id,p);
  }

  t.rounds.forEach((round,r) => {
    const before = new Map(
      t.players.map(p => [p.id,p.score])
    );

    for (const record of round.pairings) {
      if (
        record.kind === "pab" ||
        record.kind === "unplayed"
      ) {
        const p = map.get(
          record.kind === "pab"
            ? record.pabId
            : record.unplayedId
        );

        if (!p) {
          throw new Error("A round refers to an unknown player.");
        }

        p.score += record.awardedPoints;

        if (record.kind === "pab") {
          p.hadPAB = true;
          p.floats[r] = "D";
        } else {
          if (record.awardedPoints === t.winPoints) {
            p.hadUnplayedWin = true;
          }
          if (record.awardedPoints > t.lossPoints) {
            p.floats[r] = "D";
          }
        }
        continue;
      }

      const w = map.get(record.whiteId);
      const b = map.get(record.blackId);

      if (!w || !b) {
        throw new Error("A round refers to an unknown player.");
      }

      const [wp,bp] = resultPoints(record.result,t);

      if (PLAYED_RESULTS.has(record.result)) {
        w.opponents.push(b.id);
        b.opponents.push(w.id);
        w.playedColors.push("W");
        b.playedColors.push("B");
        w.roundColors[r] = "W";
        b.roundColors[r] = "B";
        w.unplayedCount--;
        b.unplayedCount--;

        if (before.get(w.id) > before.get(b.id)) {
          w.floats[r] = "D";
          b.floats[r] = "U";
        } else if (before.get(b.id) > before.get(w.id)) {
          b.floats[r] = "D";
          w.floats[r] = "U";
        }
      } else {
        if (wp === t.winPoints) w.hadUnplayedWin = true;
        if (bp === t.winPoints) b.hadUnplayedWin = true;
        if (wp > t.lossPoints) w.floats[r] = "D";
        if (bp > t.lossPoints) b.floats[r] = "D";
      }

      w.score += wp;
      b.score += bp;
    }
  });
}

function normalizeTournament(raw) {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray(raw.players)
  ) {
    throw new Error(
      "The file does not contain a tournament player list."
    );
  }

  if (
    raw.acceleration ||
    (raw.restrictions || []).length ||
    (raw.pairingRestrictions || []).length
  ) {
    throw new Error(
      "This application does not support acceleration or " +
      "additional pairing restrictions."
    );
  }

  const t = emptyTournament();

  t.name = String(raw.name || "Tournament");
  t.totalRounds = numberValue(
    raw.totalRounds ?? 5,"round count",1,30,true
  );

  const historical =
    Array.isArray(raw.rounds) && raw.rounds.length > 0;
  const pending =
    Array.isArray(raw.activePairings) &&
    raw.activePairings.length > 0;

  t.initialColor = raw.initialColor || "W";

  if (!["W","B"].includes(t.initialColor)) {
    throw new Error("Invalid initial color.");
  }

  if (
    (historical || pending) &&
    !["W","B"].includes(raw.initialColor)
  ) {
    throw new Error(
      "An existing tournament must contain its initial color allocation."
    );
  }

  t.winPoints = Number(raw.winPoints ?? 1);
  t.drawPoints = Number(raw.drawPoints ?? .5);
  t.lossPoints = Number(raw.lossPoints ?? 0);

  if (!(
    (
      t.winPoints === 1 &&
      t.drawPoints === .5 &&
      t.lossPoints === 0
    ) ||
    (
      t.winPoints === 3 &&
      t.drawPoints === 1 &&
      t.lossPoints === 0
    )
  )) {
    throw new Error("Unsupported scoring system.");
  }

  t.pabPoints = halfPointValue(
    raw.pabPoints ?? t.winPoints,"PAB points",t.winPoints
  );

  const ids = new Set();
  const tpns = new Set();

  t.players = raw.players.map((p,index) => {
    if (!p || typeof p !== "object") {
      throw new Error("Invalid player record.");
    }

    const id = String(p.id || "");

    if (!id || ids.has(id)) {
      throw new Error("Missing or duplicate player ID.");
    }
    ids.add(id);

    let tpn = Number(p.tpn || 0);

    if (tpn === 0 && !historical && !pending) {
      tpn = index+1;
    }

    if (
      !Number.isSafeInteger(tpn) ||
      tpn < 1 ||
      tpns.has(tpn)
    ) {
      throw new Error("Invalid or duplicate TPN.");
    }
    tpns.add(tpn);

    const status = p.nextRoundStatus || "pair";

    if (!STATUSES.includes(status)) {
      throw new Error("Invalid next-round status.");
    }

    return {
      id,
      tpn,
      name:String(p.name || "").trim() || "Player "+tpn,
      rating:numberValue(
        p.rating ?? 1500,"rating",0,9999,true
      ),
      title:titleValue(p.title),
      registrationOrder:index+1,
      active:p.active !== false,
      nextRoundStatus:status
    };
  });

  function records(list,complete) {
    if (!Array.isArray(list)) {
      throw new Error("Invalid round record list.");
    }

    const used = new Set();
    let pabCount = 0;
    let board = 0;

    function use(id) {
      if (!ids.has(id)) {
        throw new Error("Round record refers to an unknown player.");
      }
      if (used.has(id)) {
        throw new Error("A player appears twice in the same round.");
      }
      used.add(id);
    }

    return list.map(record => {
      if (!record || typeof record !== "object") {
        throw new Error("Invalid pairing record.");
      }

      const kind = record.kind || (
        record.pabId
          ? "pab"
          : record.unplayedId ? "unplayed" : "game"
      );

      if (kind === "game") {
        use(record.whiteId);
        use(record.blackId);

        const result = record.result || "*";

        if (
          !RESULTS.includes(result) &&
          !(result === "*" && !complete)
        ) {
          throw new Error(
            "Invalid or missing completed-game result."
          );
        }

        return {
          kind,
          board:++board,
          whiteId:record.whiteId,
          blackId:record.blackId,
          result
        };
      }

      if (kind === "pab") {
        const id = record.pabId || record.whiteId;
        use(id);

        if (++pabCount > 1) {
          throw new Error("More than one PAB in a round.");
        }

        const award = halfPointValue(
          record.awardedPoints ?? t.pabPoints,
          "PAB award",
          t.winPoints
        );

        if (award !== t.pabPoints) {
          throw new Error(
            "PAB awards must be constant throughout this tournament."
          );
        }

        return {
          kind,
          board:null,
          pabId:id,
          result:"AUTO",
          awardedPoints:award
        };
      }

      if (kind === "unplayed") {
        const id = record.unplayedId || record.whiteId;
        use(id);

        return {
          kind,
          board:null,
          unplayedId:id,
          result:"AUTO",
          awardedPoints:halfPointValue(
            record.awardedPoints ?? 0,
            "unplayed-round award",
            t.winPoints
          ),
          label:String(record.label || "Unplayed round")
        };
      }

      throw new Error("Unsupported pairing-record kind.");
    });
  }

  const rounds = raw.rounds ?? [];

  if (
    !Array.isArray(rounds) ||
    rounds.length > t.totalRounds
  ) {
    throw new Error("Invalid round history.");
  }

  t.rounds = rounds.map((round,index) => {
    if (
      !round ||
      Number(round.roundNumber ?? index+1) !== index+1
    ) {
      throw new Error(
        "Rounds must be consecutive and in chronological order."
      );
    }

    return {
      roundNumber:index+1,
      pairings:records(round.pairings,true),
      audit:round.audit || null
    };
  });

  t.activePairings = records(
    raw.activePairings || [],false
  );

  if (
    t.activePairings.length &&
    t.rounds.length >= t.totalRounds
  ) {
    throw new Error(
      "A pending round exceeds the planned tournament length."
    );
  }

  t.currentRound = t.rounds.length +
    (t.activePairings.length ? 1 : 0);

  t.highestPairedRound = Math.max(
    t.currentRound,
    numberValue(
      raw.highestPairedRound ?? t.currentRound,
      "highest paired round",
      0,
      t.totalRounds,
      true
    )
  );

  t.settingsFrozen = Boolean(
    raw.settingsFrozen || t.highestPairedRound > 0
  );

  /*
   * New lifecycle policy:
   * registration is open before the first successful pairing,
   * and closed thereafter, regardless of old saved listClosed flags.
   */
  t.listClosed = tournamentStarted(t);
  t.activeAudit = raw.activeAudit || null;

  t.players.sort((a,b) => a.tpn-b.tpn);
  rebuildState(t);

  return t;
}

function unplayedDetails(player,t = undefined) {
  if (player.nextRoundStatus === "unplayed-draw") {
    return {
      awardedPoints:t.drawPoints,
      label:"Requested unplayed round — draw value"
    };
  }

  if (player.nextRoundStatus === "unplayed-win") {
    return {
      awardedPoints:t.winPoints,
      label:"Administrative unplayed round — win value"
    };
  }

  return {
    awardedPoints:t.lossPoints,
    label:"Unplayed round — loss value"
  };
}

/** Return the next round without modifying the supplied tournament. */
function nextPairing(raw, options = {}) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.players)) {
    throw new Error("A tournament with a players array is required.");
  }
  const input = JSON.parse(JSON.stringify(raw));
  input.initialColor ??= "W";
  for (const p of input.players) {
    if (!p || typeof p !== "object") throw new Error("Invalid player record.");
    if (typeof p.id !== "string" || !p.id.trim()) {
      throw new Error("Player IDs must be nonempty strings.");
    }
    if (typeof p.name !== "string" || !p.name.trim()) {
      throw new Error("A player name is required.");
    }
    p.rating = p.elo ?? p.rating;
    if (p.rating === undefined) throw new Error("Player elo is required.");
    p.title = titleValue(p.title);
    p.registrationOrder = input.players.indexOf(p) + 1;
  }
  // Preserve explicit pairing numbers; otherwise establish the initial ranking.
  const hasTPN = input.players.some(p => p.tpn !== undefined);
  if (hasTPN && input.players.some(p => p.tpn === undefined)) {
    throw new Error("Supply tpn for every player or for none of them.");
  }
  if (!hasTPN) {
    for (const p of input.players) {
      p.rating = numberValue(p.rating,"elo",0,9999,true);
    }
    assignTPNs(input);
  }
  const t = normalizeTournament(input);
  if (t.activePairings.length) {
    throw new Error("Finish the pending round and move it into rounds first.");
  }
  const roundNumber = t.rounds.length + 1;
  if (roundNumber > t.totalRounds) throw new Error("The tournament is complete.");
  const active = t.players.filter(p => p.active);
  if (!active.length) throw new Error("No players are active.");
  const players = active.filter(p => p.nextRoundStatus === "pair");
  const result = players.length ? Core.solve({
    roundNumber,
    totalRounds:t.totalRounds,
    winPoints:t.winPoints,
    initialColor:t.initialColor,
    players
  }, options.limits, options.onProgress) : {
    engineVersion:Core.VERSION, pairs:[], pabId:null, byeScore:null,
    trace:[], stats:{nodes:0,elapsedMs:0}
  };
  const map = new Map(t.players.map(p => [p.id,p]));
  const pairs = [...result.pairs].sort((a,b) => {
    const aw = map.get(a.whiteId), ab = map.get(a.blackId);
    const bw = map.get(b.whiteId), bb = map.get(b.blackId);
    const ah = Core.rank(aw,ab) <= 0 ? aw : ab;
    const bh = Core.rank(bw,bb) <= 0 ? bw : bb;
    return bh.score-ah.score || (bw.score+bb.score)-(aw.score+ab.score) || ah.tpn-bh.tpn;
  });
  const pairings = pairs.map((pair,index) => ({
    kind:"game", board:index+1, ...pair, result:"*"
  }));
  if (result.pabId !== null) pairings.push({
    kind:"pab", board:null, pabId:result.pabId,
    result:"AUTO", awardedPoints:t.pabPoints
  });
  for (const p of active.filter(p => p.nextRoundStatus !== "pair")) {
    pairings.push({kind:"unplayed", board:null, unplayedId:p.id,
      result:"AUTO", ...unplayedDetails(p,t)});
  }
  return {
    roundNumber,
    players:t.players.map(p => ({
      id:p.id, name:p.name, elo:p.rating, tpn:p.tpn, title:p.title,
      active:p.active, nextRoundStatus:p.nextRoundStatus, score:p.score
    })),
    pairings,
    audit:{engineVersion:result.engineVersion, byeScore:result.byeScore,
      stats:result.stats, brackets:result.trace}
  };
}

const FideDutchEngine = Object.freeze({
  nextPairing,
  version:Core.VERSION,
  selfTest:Core.selfTest
});
if (typeof module !== "undefined" && module.exports) {
  module.exports = FideDutchEngine;
} else {
  globalThis.FideDutchEngine = FideDutchEngine;
}
