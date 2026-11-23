"use strict";

function analyzeWithStockfish(fen, moves, signal, { moveTime = 1200, timeout = 10_000, multiPV = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./assets/stockfish/stockfish-19-lite-single.js");
    let evaluation = null;
    const variationsByDepth = new Map();
    const abort = () => finish(reject, signal.reason);
    const timer = setTimeout(() => finish(reject, new Error("Stockfish timed out")), timeout);

    function finish(settle, value) {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      settle(value);
    }

    worker.onerror = () => finish(reject, new Error("Stockfish failed to load"));
    worker.onmessage = ({ data }) => {
      for (const line of String(data).split(/\r?\n/)) {
        if (line === "uciok") {
          if (multiPV > 1) worker.postMessage("setoption name MultiPV value " + multiPV);
          worker.postMessage("isready");
        }
        if (line === "readyok") {
          const history = moves.length ? " moves " + moves.join(" ") : "";
          worker.postMessage("position fen " + fen + history);
          worker.postMessage("go movetime " + moveTime);
        }
        const score = line.match(/^info .*\bscore (mate|cp) (-?\d+)\b/);
        if (score && !/\b(?:lowerbound|upperbound)\b/.test(line)) {
          const value = { type: score[1], value: Number(score[2]) };
          const rank = Number(line.match(/\bmultipv (\d+)\b/)?.[1] ?? 1);
          if (rank === 1) evaluation = value;
          const depth = Number(line.match(/^info depth (\d+)\b/)?.[1]);
          const firstMove = line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)\b/)?.[1];
          if (multiPV > 1 && depth && firstMove) {
            if (!variationsByDepth.has(depth)) variationsByDepth.set(depth, new Map());
            variationsByDepth.get(depth).set(rank, { move: firstMove, evaluation: value });
          }
        }
        const best = line.match(/^bestmove\s+(\S+)/);
        if (best) {
          const move = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best[1]) ? best[1] : null;
          const completeDepth = Math.max(...[...variationsByDepth]
            .filter(([, lines]) => lines.size === multiPV && lines.get(1)?.move === move)
            .map(([depth]) => depth));
          const variations = variationsByDepth.get(completeDepth);
          const top = variations?.get(1).evaluation;
          const bestMoves = variations ? [...variations.values()]
            .filter(line => line.evaluation.type === top.type && line.evaluation.value === top.value)
            .map(line => line.move) : [];
          finish(resolve, { move, evaluation, bestMoves });
          return;
        }
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else worker.postMessage("uci");
  });
}
