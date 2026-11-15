import { Chess } from './vendor/chess.js';

export function distanceForWhite(value, turn, approximate = false) {
  if (!Number.isInteger(value)) return '—';
  const signed = turn === 'w' ? value : -value;
  return `${approximate ? '≈ ' : ''}${signed > 0 ? '+' : ''}${signed}`;
}

export function outcomeForWhite(category, turn) {
  const side = turn === 'w' ? 'Vit' : 'Svart';
  const other = turn === 'w' ? 'Svart' : 'Vit';
  return ({win:`${side} vinner`, loss:`${other} vinner`, draw:'Remi',
    'cursed-win':`Remi med 50-dragsregeln (${side} vinner utan)`,
    'blessed-loss':`Remi med 50-dragsregeln (${other} vinner utan)`,
    'maybe-win':`${side} kan vinna`, 'maybe-loss':`${other} kan vinna`,
    'syzygy-win':`${side} vinner`, 'syzygy-loss':`${other} vinner`})[category] ?? 'Okänt';
}

export class AnalysisBoard {
  constructor({probe, document:doc = document, prompt = (...args) => window.prompt(...args)}) {
    this.$ = id => doc.getElementById(id);
    this.doc = doc;
    this.probe = probe;
    this.prompt = prompt;
    this.visible = false;
    this.version = 0;
    this.redoMoves = [];
    this.$('syzygy').setAttribute('aria-expanded', 'false');
    this.$('syzygy').addEventListener('click', () => this.toggle());
    this.$('analysis-reset').addEventListener('click', () => this.reset());
    this.$('analysis-undo').addEventListener('click', () => {
      const move = this.game?.undo();
      if (move) { this.redoMoves.push(move); this.last = this.game.history({verbose:true}).at(-1); return this.refresh(); }
    });
    this.$('analysis-redo').addEventListener('click', () => {
      const move = this.redoMoves.pop();
      if (move) { this.last = this.game.move(move); return this.refresh(); }
    });
    this.$('analysis-best').addEventListener('click', () => {
      if (!this.loading && this.data?.moves[0]) return this.playUci(this.data.moves[0].uci);
    });
    this.$('analysis-flip').addEventListener('click', () => { this.flipped = !this.flipped; this.render(); });
    this.$('analysis-retry').addEventListener('click', () => this.refresh());
  }

  updateTraining(fen, flipped) {
    if (fen === this.trainingFen) return;
    this.trainingFen = fen;
    this.trainingFlipped = flipped;
    if (this.visible) return this.reset();
  }

  toggle() {
    if (!this.trainingFen) return;
    this.visible = !this.visible;
    this.$('analysis-panel').hidden = !this.visible;
    this.$('syzygy').setAttribute('aria-expanded', String(this.visible));
    this.$('syzygy').textContent = this.visible ? 'Dölj Syzygy' : 'Visa Syzygy';
    if (this.visible) return this.reset();
    this.version++;
    this.controller?.abort();
  }

  reset() {
    if (!this.trainingFen) return;
    this.game = new Chess(this.trainingFen);
    this.flipped = this.trainingFlipped;
    this.last = null;
    this.redoMoves = [];
    return this.refresh();
  }

  async refresh() {
    this.controller?.abort();
    const controller = this.controller = new AbortController();
    const version = ++this.version;
    this.selected = null;
    this.data = null;
    this.loading = true;
    this.error = null;
    this.render();
    try {
      if (this.game.isGameOver()) {
        this.data = {category:this.game.isCheckmate() ? 'loss' : 'draw',
          dtm:this.game.isCheckmate() ? 0 : null, moves:[]};
      } else {
        const data = await this.probe(this.game.fen(), controller.signal);
        if (version !== this.version || controller.signal.aborted) return;
        this.data = data;
      }
    } catch (error) {
      if (version !== this.version || controller.signal.aborted) return;
      this.error = error.message;
    } finally {
      if (version === this.version && !controller.signal.aborted) {
        this.loading = false;
        this.render();
      }
    }
  }

  async playUci(uci) {
    const move = this.game.moves({verbose:true}).find(move => move.from + move.to + (move.promotion ?? '') === uci);
    if (!move) return;
    this.last = this.game.move(move);
    this.redoMoves = [];
    return this.refresh();
  }

  squareClick(square) {
    if (this.game.isGameOver()) return;
    const piece = this.game.get(square);
    if (piece?.color === this.game.turn()) {
      this.selected = this.selected === square ? null : square;
      this.render();
      return;
    }
    if (!this.selected) return;
    const moves = this.game.moves({square:this.selected, verbose:true}).filter(move => move.to === square);
    if (!moves.length) return;
    let promotion = '';
    if (moves.some(move => move.promotion)) {
      promotion = this.prompt('Promovera till q (dam), r (torn), b (löpare) eller n (springare)', 'q')?.trim().toLowerCase();
      if (!['q', 'r', 'b', 'n'].includes(promotion)) return;
    }
    return this.playUci(this.selected + square + promotion);
  }

  render() {
    if (!this.game) return;
    const data = this.data;
    const turn = this.game.turn();
    const legal = this.game.moves({verbose:true});
    const best = data?.moves[0];
    const bestMove = legal.find(move => move.from + move.to + (move.promotion ?? '') === best?.uci);
    this.$('analysis-turn').textContent = `${turn === 'w' ? 'Vit' : 'Svart'} vid draget${this.game.isCheck() ? ' · schack' : ''}`;
    this.$('analysis-status').textContent = this.error ? this.error : this.loading ? 'Syzygy analyserar…' : this.game.isCheckmate() ? 'Schackmatt.' : this.game.isStalemate() ? 'Remi - Patt' : this.game.isGameOver() ? 'Remi.' : outcomeForWhite(data?.category, turn);
    this.$('analysis-retry').hidden = !this.error;
    this.$('analysis-dtz').textContent = distanceForWhite(data?.precise_dtz ?? data?.dtz, turn, !Number.isInteger(data?.precise_dtz) && Number.isInteger(data?.dtz));
    this.$('analysis-dtm').textContent = distanceForWhite(data?.dtm, turn);
    this.$('analysis-recommendation').textContent = bestMove ? `Rekommenderat: ${bestMove.san} (${bestMove.from} → ${bestMove.to})` : this.loading ? 'Hämtar rekommenderat drag…' : 'Inget rekommenderat drag.';
    this.$('analysis-best').disabled = this.loading || !bestMove;
    this.$('analysis-undo').disabled = !this.game.history().length;
    this.$('analysis-redo').disabled = !this.redoMoves.length;
    this.$('analysis-history').textContent = this.game.history().join('  ') || 'Prova ett drag på brädet eller i tabellen. Du spelar båda sidor.';
    this.$('analysis-fen').textContent = this.game.fen();
    this.$('analysis-board').replaceChildren();
    const files = this.flipped ? 'hgfedcba' : 'abcdefgh';
    const ranks = this.flipped ? '12345678' : '87654321';
    for (const rank of ranks) for (const file of files) {
      const square = file + rank, piece = this.game.get(square);
      const button = this.doc.createElement('button');
      button.className = 'square' + ((file.charCodeAt(0) + Number(rank)) % 2 ? '' : ' dark');
      if (this.selected === square) button.classList.add('selected');
      if (legal.some(move => move.from === this.selected && move.to === square)) button.classList.add('target');
      if (this.last && [this.last.from, this.last.to].includes(square)) button.classList.add('last');
      if (bestMove?.from === square) button.classList.add('hint-from');
      if (bestMove?.to === square) button.classList.add('hint-to');
      button.setAttribute('aria-label', `${square}${piece ? ` ${piece.color === 'w' ? 'vit' : 'svart'} ${piece.type}` : ', tom'}`);
      button.setAttribute('aria-pressed', String(this.selected === square));
      if (piece) {
        const image = this.doc.createElement('img');
        image.src = `./assets/pieces/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`;
        image.alt = ''; image.draggable = false; image.className = 'piece';
        button.append(image);
      }
      const coord = this.doc.createElement('small');
      coord.textContent = (file === files[0] ? rank : '') + (rank === ranks[7] ? file : '');
      button.append(coord);
      button.addEventListener('click', () => this.squareClick(square));
      this.$('analysis-board').append(button);
    }
    const afterTurn = turn === 'w' ? 'b' : 'w';
    this.$('analysis-moves').replaceChildren(...(data?.moves ?? []).map((move, index) => {
      const row = this.doc.createElement('tr');
      const cell = this.doc.createElement('td');
      const button = this.doc.createElement('button');
      const notation = legal.find(candidate => candidate.from + candidate.to + (candidate.promotion ?? '') === move.uci)?.san ?? move.uci;
      button.textContent = `${index === 0 ? '★ ' : ''}${notation}`;
      button.className = 'text-button';
      button.setAttribute('aria-label', `Prova ${notation}`);
      button.addEventListener('click', () => this.playUci(move.uci));
      cell.append(button); row.append(cell);
      for (const value of [outcomeForWhite(move.category, afterTurn),
        distanceForWhite(move.precise_dtz ?? move.dtz, afterTurn, !Number.isInteger(move.precise_dtz) && Number.isInteger(move.dtz)),
        distanceForWhite(move.dtm, afterTurn)]) {
        const cell = this.doc.createElement('td'); cell.textContent = value; row.append(cell);
      }
      return row;
    }));
  }
}
