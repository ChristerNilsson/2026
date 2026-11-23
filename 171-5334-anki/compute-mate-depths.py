"""Recalculate mate depths with the bundled Stockfish engine and python-chess."""

from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from pathlib import Path
import json
import os
import re
import subprocess
from tempfile import NamedTemporaryFile

import chess


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "5334.json"
ENGINE = ROOT / "assets" / "stockfish" / "stockfish-19-lite-single.js"
TRAINING_LIMIT = 4462
MAX_VERIFIED_DEPTH = 4
SCORE = re.compile(r"\bscore (mate|cp) (-?\d+)\b.*\bpv ([a-h][1-8][a-h][1-8][qrbn]?)\b")


def analyze_batch(problems):
    with subprocess.Popen(
        ["node", str(ENGINE)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    ) as engine:
        def send(command):
            engine.stdin.write(command + "\n")
            engine.stdin.flush()

        def output_until(prefix):
            for line in engine.stdout:
                if line.startswith(prefix):
                    return
                yield line
            raise RuntimeError(f"Stockfish exited while waiting for {prefix}")

        def search(fen, depth, nodes):
            send("ucinewgame")
            send("position fen " + fen)
            send(f"go depth {depth} nodes {nodes}")
            result = (None, None)
            for line in output_until("bestmove"):
                score = SCORE.search(line)
                if score and "lowerbound" not in line and "upperbound" not in line:
                    kind, value, move = score.groups()
                    mate = int(value)
                    result = (mate, move) if kind == "mate" and mate > 0 else (None, None)
            return result

        send("uci")
        for _ in output_until("uciok"):
            pass
        send("isready")
        for _ in output_until("readyok"):
            pass

        results = {}
        try:
            for problem_id, fen in problems:
                result = search(fen, 16, 16_000)
                if problem_id <= TRAINING_LIMIT and result[0] is None:
                    result = search(fen, 24, 120_000)
                results[problem_id] = result
        finally:
            send("quit")
        return results


def forced_mate(board, depth, preferred=None):
    def wins(move):
        board.push(move)
        try:
            if depth == 1:
                return board.is_checkmate()
            replies = list(board.legal_moves)
            if not replies:
                return board.is_check()
            for reply in replies:
                board.push(reply)
                continuation = forced_mate(board, depth - 1)
                board.pop()
                if continuation is None:
                    return False
            return True
        finally:
            board.pop()

    if preferred is not None and board.is_legal(preferred) and wins(preferred):
        return preferred
    return next((move for move in board.legal_moves if move != preferred and wins(move)), None)


def verify_training_batch(problems):
    results = {}
    for problem_id, fen, (estimate, first_move) in problems:
        board = chess.Board(fen)
        preferred = chess.Move.from_uci(first_move) if first_move else None
        for depth in range(1, MAX_VERIFIED_DEPTH + 1):
            move = forced_mate(board, depth, preferred)
            if move is not None:
                results[problem_id] = (depth, move.uci())
                break
        else:
            results[problem_id] = (estimate, first_move) if estimate and estimate > MAX_VERIFIED_DEPTH else (None, None)
    return results


def main():
    original = DATA.read_bytes()
    data = json.loads(original)
    excluded = set(data["summary"]["review_ids"])
    jobs = [(p["id"], p["fen"]) for p in data["problems"] if p["id"] not in excluded and p["fen"]]
    workers = min(8, os.cpu_count() or 1)
    batches = [jobs[index::workers] for index in range(workers)]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = {}
        for batch in pool.map(analyze_batch, batches):
            results.update(batch)
    print("Stockfish scan complete. Verifying short mates in the training set.", flush=True)
    training = [(problem_id, fen, results[problem_id]) for problem_id, fen in jobs if problem_id <= TRAINING_LIMIT]
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for batch in pool.map(verify_training_batch, [training[index::workers] for index in range(workers)]):
            results.update(batch)

    for problem in data["problems"]:
        problem["mate_depth"], problem["mate_move"] = results.get(problem["id"], (None, None))
    note = (
        "mate_depth and mate_move are derived from the FEN with Stockfish.js 19.0.1 "
        "(depth 16 / 16000 nodes, with depth 24 / 120000 nodes on retry for training IDs 1–4462). "
        "For training IDs, python-chess determines the shortest forced mate up to four moves "
        "by searching all legal defenses. Longer mates and IDs above 4462 are Stockfish estimates. "
        "Null means that neither search confirmed mate within its limits, or the diagram was skipped for review."
    )
    data["notes"] = [line for line in data["notes"] if not line.startswith("mate_depth and mate_move are derived")]
    data["notes"].append(note)

    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if b"\r\n" in original:
        text = text.replace("\n", "\r\n")
    with NamedTemporaryFile(dir=ROOT, delete=False) as destination:
        pending = Path(destination.name)
        destination.write(text.encode("utf-8"))
    try:
        if DATA.read_bytes() != original:
            raise RuntimeError("5334.json changed during the search. Run the analysis again.")
        pending.replace(DATA)
    finally:
        pending.unlink(missing_ok=True)
    print(f"Stored mate depths for {sum(depth is not None for depth, _ in results.values())} of {len(data['problems'])} positions.")
    unresolved_training = [
        problem_id for problem_id, (depth, _) in results.items() if problem_id <= TRAINING_LIMIT and depth is None
    ]
    print("Training positions without a mate depth:", sorted(unresolved_training))


if __name__ == "__main__":
    main()
