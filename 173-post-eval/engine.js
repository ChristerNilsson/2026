const workerUrl = new URL('./vendor/stockfish-17.1-lite-single-03e3232.js', import.meta.url);

export class Engine {
  constructor() {
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = ({ data }) => {
      for (const line of String(data).split(/\r?\n/)) this.pending?.receive(line);
    };
    this.worker.onerror = () => {
      this.failure = new Error('Stockfish kunde inte laddas.');
      this.pending?.reject(this.failure);
    };
  }

  exchange(commands, receive, timeout = 90000) {
    return new Promise((resolve, reject) => {
      if (this.failure) return reject(this.failure);
      const finish = (callback, value) => {
        clearTimeout(timer);
        this.pending = null;
        callback(value);
      };
      const timer = timeout && setTimeout(() => {
        this.close(new Error('Stockfish svarade inte i tid.'));
      }, timeout);
      this.pending = {
        receive: line => {
          const value = receive(line);
          if (value !== undefined) finish(resolve, value);
        },
        reject: error => finish(reject, error),
      };
      for (const cmd of commands) this.worker.postMessage(cmd);
    });
  }

  async init() {
    await this.exchange(['uci'], line => line === 'uciok' || undefined);
    await this.exchange(['isready'], line => line === 'readyok' || undefined);
  }

  async search(position, limit, { elo, move } = {}) {
    const skill = elo === undefined ? 20 : Math.max(0, Math.min(20, Math.round((elo - 800) / 100)));
    const useElo = elo >= 1320;
    await this.exchange([
      'setoption name Clear Hash',
      'setoption name Skill Level value ' + skill,
      'setoption name UCI_LimitStrength value ' + useElo,
      ...(useElo ? ['setoption name UCI_Elo value ' + Math.min(3190, elo)] : []),
      'isready',
    ], line => line === 'readyok' || undefined);
    let exact;
    let bound;
    return this.exchange([position, 'go ' + limit + (move ? ' searchmoves ' + move : '')], line => {
      const score = line.match(/^info .*\bscore (cp|mate) (-?\d+)/);
      if (score && !/\bmultipv [2-9]\d*\b/.test(line)) {
        const value = { type: score[1], value: Number(score[2]) };
        if (/\b(?:upperbound|lowerbound)\b/.test(line)) bound = { ...value, bound: true };
        else exact = value;
      }
      if (line.startsWith('bestmove ')) return { move: line.split(/\s+/)[1], score: exact ?? bound };
    }, elo === undefined ? 90000 : 0);
  }

  close(error = new Error('Motorn stängdes.')) {
    this.failure = error;
    this.worker.terminate();
    this.pending?.reject(error);
  }
}

export const uci = move => move.from + move.to + (move.promotion ?? '');

export function loss(best, played) {
  if (best?.type === 'mate' || played?.type === 'mate') return null;
  if (!best || !played) throw new Error('Sökgränsen räckte inte för en CPL-bedömning.');
  return Math.max(0, best.value - played.value);
}
