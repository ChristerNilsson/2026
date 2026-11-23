"use strict";

const chessFiles = "abcdefgh";
const chessSquares = [..."12345678"].flatMap(rank => [...chessFiles].map(file => file + rank));
const rookRights = { a1: "Q", h1: "K", a8: "q", h8: "k" };
const pieceSide = piece => piece === piece.toUpperCase() ? "w" : "b";
const otherSide = side => side === "w" ? "b" : "w";

function reaches(board, from, to, attacksOnly = false) {
  if (from === to) return false;
  const file = chessFiles.indexOf(from[0]);
  const rank = Number(from[1]);
  const dx = chessFiles.indexOf(to[0]) - file;
  const dy = Number(to[1]) - rank;
  const piece = board[from];
  const kind = piece.toLowerCase();
  const side = pieceSide(piece);
  const target = board[to];
  if (kind === "p") {
    const forward = side === "w" ? 1 : -1;
    if (Math.abs(dx) === 1 && dy === forward) return attacksOnly || Boolean(target);
    if (attacksOnly || dx || target) return false;
    return dy === forward || (
      rank === (side === "w" ? 2 : 7) && dy === 2 * forward && !board[from[0] + (rank + forward)]
    );
  }
  if (kind === "n") return Math.abs(dx * dy) === 2;
  if (kind === "k") return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
  const diagonal = Math.abs(dx) === Math.abs(dy);
  const straight = !dx || !dy;
  if (!((kind !== "r" && diagonal) || (kind !== "b" && straight))) return false;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  for (let step = 1; step < distance; step++) {
    if (board[chessFiles[file + Math.sign(dx) * step] + (rank + Math.sign(dy) * step)]) return false;
  }
  return true;
}

function inCheck(board, side) {
  const kingPiece = side === "w" ? "K" : "k";
  const king = Object.keys(board).find(square => board[square] === kingPiece);
  for (const from in board) {
    if (pieceSide(board[from]) !== side && reaches(board, from, king, true)) return true;
  }
  return false;
}

function* legalMoves(board, side, rights = "", enPassant = "-") {
  for (const [from, piece] of Object.entries(board)) {
    if (pieceSide(piece) !== side) continue;
    const kind = piece.toLowerCase();
    for (const to of chessSquares) {
      const target = board[to];
      if (target && (pieceSide(target) === side || target.toLowerCase() === "k")) continue;
      const captureEnPassant = kind === "p" && to === enPassant && !target && from[0] !== to[0]
        && reaches({ ...board, [to]: piece }, from, to);
      const homeRank = side === "w" ? "1" : "8";
      const castle = kind === "k" && from === "e" + homeRank && to[1] === homeRank && "cg".includes(to[0]);
      if (!captureEnPassant && !castle && !reaches(board, from, to)) continue;
      const next = { ...board, [to]: piece };
      delete next[from];
      if (captureEnPassant) {
        const captured = to[0] + from[1];
        if (board[captured] !== (side === "w" ? "p" : "P")) continue;
        delete next[captured];
      }
      if (castle) {
        const short = to[0] === "g";
        const rookFrom = (short ? "h" : "a") + homeRank;
        const middle = (short ? "f" : "d") + homeRank;
        const right = short ? "k" : "q";
        if (!rights.includes(side === "w" ? right.toUpperCase() : right)
          || board[rookFrom] !== (side === "w" ? "R" : "r")
          || target || board[middle] || (!short && board["b" + homeRank])
          || inCheck(board, side)) continue;
        const crossing = { ...board, [middle]: piece };
        delete crossing[from];
        if (inCheck(crossing, side)) continue;
        next[middle] = next[rookFrom];
        delete next[rookFrom];
      }
      if (inCheck(next, side)) continue;
      let nextRights = rights;
      if (kind === "k") nextRights = nextRights.replace(side === "w" ? /[KQ]/g : /[kq]/g, "");
      if (nextRights && rookRights[from]) nextRights = nextRights.replace(rookRights[from], "");
      if (nextRights && rookRights[to]) nextRights = nextRights.replace(rookRights[to], "");
      const nextEnPassant = kind === "p" && Math.abs(Number(from[1]) - Number(to[1])) === 2
        ? from[0] + ((Number(from[1]) + Number(to[1])) / 2) : "-";
      const move = { uci: from + to, board: next, rights: nextRights, enPassant: nextEnPassant };
      if (kind === "p" && to[1] === (side === "w" ? "8" : "1")) {
        for (const promotion of "qrbn") {
          yield { ...move, uci: move.uci + promotion, board: { ...next, [to]: side === "w" ? promotion.toUpperCase() : promotion } };
        }
      } else {
        yield move;
      }
    }
  }
}

function movesFrom(position, side) {
  return legalMoves(position.board, side, position.rights, position.enPassant);
}

function isMate(position, side) {
  return inCheck(position.board, side) && movesFrom(position, side).next().done;
}

function shortNotation(position, move) {
  const from = move.uci.slice(0, 2);
  const to = move.uci.slice(2, 4);
  const piece = position.board[from];
  const kind = piece.toLowerCase();
  const side = pieceSide(piece);
  const defending = otherSide(side);
  const check = inCheck(move.board, defending);
  const suffix = check ? (movesFrom(move, defending).next().done ? "#" : "+") : "";
  if (kind === "k" && Math.abs(chessFiles.indexOf(from[0]) - chessFiles.indexOf(to[0])) === 2) {
    return (to[0] === "g" ? "O-O" : "O-O-O") + suffix;
  }

  const capture = Boolean(position.board[to]) || (kind === "p" && from[0] !== to[0]);
  let prefix = capture ? from[0] : "";
  if (kind !== "p") {
    const peers = [...movesFrom(position, side)].map(candidate => candidate.uci.slice(0, 4))
      .filter(candidate => candidate.endsWith(to) && !candidate.startsWith(from)
        && position.board[candidate.slice(0, 2)] === piece);
    let origin = "";
    if (peers.length) {
      const sameFile = peers.some(candidate => candidate[0] === from[0]);
      const sameRank = peers.some(candidate => candidate[1] === from[1]);
      origin = sameFile ? (sameRank ? from : from[1]) : from[0];
    }
    prefix = kind.toUpperCase() + origin;
  }
  const promotion = move.uci[4] ? "=" + move.uci[4].toUpperCase() : "";
  return prefix + (capture ? "x" : "") + to + promotion + suffix;
}

function mateLine(move, attacker, remaining) {
  const defender = otherSide(attacker);
  if (remaining === 1) return isMate(move, defender) ? [move] : null;
  let example = null;
  for (const reply of movesFrom(move, defender)) {
    const continuation = findMateLine(reply, attacker, remaining - 1);
    if (!continuation) return null;
    if (!example || continuation.length > example.length - 2) {
      example = [move, reply, ...continuation];
    }
  }
  return example ?? (inCheck(move.board, defender) ? [move] : null);
}

function findMateLine(position, attacker, remaining, preferredMove) {
  if (preferredMove) {
    const preferred = [...movesFrom(position, attacker)].find(move => move.uci === preferredMove);
    if (preferred) {
      const line = mateLine(preferred, attacker, remaining);
      if (line) return line;
    }
  }
  for (const move of movesFrom(position, attacker)) {
    if (move.uci === preferredMove) continue;
    const line = mateLine(move, attacker, remaining);
    if (line) return line;
  }
  return null;
}
