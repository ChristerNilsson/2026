"""Run with python main.py. Stockfish is installed separately."""
import os
import math
import queue
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, simpledialog, ttk

import chess
import chess.engine

from rules import Clock, loss_reason
from game_log import GameLog

CELL = 70
MATE_CP = 100000
ANALYSIS_TIME_LIMIT = 5.0
STOCKFISH_PATH = r"C:\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe"
PIECE_DIRECTORY = Path(__file__).resolve().parent / "assets" / "pieces" / "cburnett"
LOG_PATH = Path(__file__).resolve().parent / "logg.pgn"


def create_window():
    # Some Windows virtual environments do not locate the base install's Tcl.
    if sys.platform == "win32":
        tcl = Path(sys.base_prefix) / "tcl"
        for variable, folder in (("TCL_LIBRARY", "tcl8.6"), ("TK_LIBRARY", "tk8.6")):
            if (tcl / folder).is_dir():
                os.environ.setdefault(variable, str(tcl / folder))
    return tk.Tk()


class App:
    def __init__(self, root):
        self.root = root
        self.piece_images = {
            (color, piece_type): tk.PhotoImage(
                master=root,
                file=str(PIECE_DIRECTORY / f"{'w' if color else 'b'}{chess.piece_symbol(piece_type).upper()}.png"))
            for color in chess.COLORS for piece_type in chess.PIECE_TYPES
        }
        root.title("Sudden Death Chess — 15+10")
        self.board = chess.Board()
        self.human = chess.WHITE
        self.engine = None
        self.active = False
        self.busy = False
        self.generation = 0
        self.selected = None
        self.review = None
        self.game_log = None
        self.events = queue.Queue()
        self.clocks = {c: Clock() for c in chess.COLORS}
        self.absolute = tk.StringVar(value="300")
        self.relative = tk.StringVar(value="100")
        self.max_time = tk.StringVar(value="5")
        self.engine_time_limit = 5.0
        self.color = tk.StringVar(value="Vit")
        self.status = tk.StringVar(value="Ange inställningarna och tryck på Starta parti.")
        self.clock_text = tk.StringVar()
        panel = ttk.Frame(root, padding=12)
        panel.pack(fill="both", expand=True)
        ttk.Label(panel, text="Drag och värdering (ur ditt perspektiv)").grid(row=0, column=5, padx=12)
        history_panel = ttk.Frame(panel, width=640)
        history_panel.grid(row=1, column=5, rowspan=8, padx=(12, 0), sticky="nsew")
        panel.columnconfigure(5, weight=1)
        history_panel.columnconfigure(0, weight=1)
        history_panel.rowconfigure(0, weight=1)
        columns = ("nr", "white", "white_best", "black", "black_best",
                   "white_eval", "white_best_eval", "black_eval", "black_best_eval")
        self.history = ttk.Treeview(history_panel, columns=columns, show="headings", height=26)
        headings = ("Nr", "Vit", "Vits bästa", "Svart", "Svarts bästa",
                    "Värd. vit", "Värd. vit bäst", "Värd. svart", "Värd. svart bäst")
        for column, heading in zip(columns, headings):
            self.history.heading(column, text=heading)
            self.history.column(column, width=40 if column == "nr" else 85, minwidth=40, anchor="center")
        self.history.tag_configure("alternate", background="#f0f3f5")
        self.history.grid(row=0, column=0, sticky="nsew")
        history_scroll = ttk.Scrollbar(history_panel, command=self.history.yview)
        history_scroll.grid(row=0, column=1, sticky="ns")
        history_horizontal = ttk.Scrollbar(history_panel, orient="horizontal", command=self.history.xview)
        history_horizontal.grid(row=1, column=0, sticky="ew")
        self.history.configure(yscrollcommand=history_scroll.set, xscrollcommand=history_horizontal.set)
        self.log_status = tk.StringVar(value=f"Partier sparas i {LOG_PATH}")
        ttk.Label(panel, textvariable=self.log_status, wraplength=850).grid(row=9, column=0, columnspan=6, sticky="w")
        ttk.Label(panel, text="Stockfish-fil:").grid(row=0, column=0, sticky="w")
        ttk.Label(panel, text=STOCKFISH_PATH, wraplength=450).grid(row=0, column=1, columnspan=4, sticky="w")
        ttk.Label(panel, text="Absolut gräns (cp):").grid(row=1, column=0, sticky="w")
        ttk.Entry(panel, textvariable=self.absolute, width=8).grid(row=1, column=1)
        ttk.Label(panel, text="Relativ gräns (cp):").grid(row=1, column=2)
        ttk.Entry(panel, textvariable=self.relative, width=8).grid(row=1, column=3)
        ttk.Combobox(panel, textvariable=self.color, values=["Vit", "Svart"], state="readonly", width=8).grid(row=1, column=4)
        self.start_button = ttk.Button(panel, text="Starta parti", command=self.start)
        self.start_button.grid(row=2, column=0, pady=8)
        ttk.Button(panel, text="Ge upp", command=self.resign).grid(row=2, column=1)
        ttk.Button(panel, text="Kräv remi", command=self.claim_draw).grid(row=2, column=2)
        time_settings = ttk.Frame(panel)
        time_settings.grid(row=2, column=3, columnspan=2, padx=6)
        ttk.Label(time_settings, text="Max s/drag (tomt = auto):").pack(side="left")
        ttk.Entry(time_settings, textvariable=self.max_time, width=6).pack(side="left", padx=4)
        ttk.Label(panel, textvariable=self.clock_text, font=("Segoe UI", 14)).grid(row=3, column=0, columnspan=5)
        self.canvas = tk.Canvas(panel, width=8*CELL, height=8*CELL, highlightthickness=0)
        self.canvas.grid(row=4, column=0, columnspan=5, pady=8)
        self.canvas.bind("<Button-1>", self.click)
        ttk.Label(panel, textvariable=self.status, wraplength=560).grid(row=5, column=0, columnspan=5, sticky="w")
        ttk.Label(panel, text="Klicka på pjäs och målruta. 100 cp = en bonde. Gränser gäller dina drag.").grid(row=6, column=0, columnspan=5, pady=6)
        self.review_text = tk.StringVar()
        ttk.Label(panel, textvariable=self.review_text, wraplength=560).grid(row=7, column=0, columnspan=5, sticky="w")
        self.reveal_button = ttk.Button(panel, text="Visa Stockfishs svar", command=self.reveal_answer, state="disabled")
        self.reveal_button.grid(row=8, column=0, columnspan=3, pady=6)
        root.protocol("WM_DELETE_WINDOW", self.close)
        self.draw()
        self.poll()

    def submit(self, job, callback):
        generation = self.generation
        self.busy = True
        def work():
            try:
                result = job()
                self.events.put((generation, callback, result, None))
            except Exception as exc:
                self.events.put((generation, callback, None, str(exc)))
        threading.Thread(target=work, daemon=True).start()

    def start(self):
        if self.active or self.busy:
            return
        try:
            self.abs_limit, self.rel_limit = int(self.absolute.get()), int(self.relative.get())
            if min(self.abs_limit, self.rel_limit) < 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Ogiltiga gränser", "Ange två heltal som är minst 0.")
            return
        try:
            value = self.max_time.get().strip().replace(",", ".")
            time_limit = float(value) if value else None
            if time_limit is not None and (not math.isfinite(time_limit) or time_limit < 0.001):
                raise ValueError
        except ValueError:
            messagebox.showerror("Ogiltig betänketid", "Ange minst 0,001 sekunder eller lämna fältet tomt för automatisk tidsfördelning.")
            return
        self.generation += 1
        self.engine_time_limit = time_limit
        self.review = None
        self.review_text.set("")
        for row in self.history.get_children():
            self.history.delete(row)
        self.reveal_button.configure(state="disabled")
        self.human = self.color.get() == "Vit"
        self.board.reset()
        self.selected = None
        self.clocks = {c: Clock() for c in chess.COLORS}
        self.start_button.configure(state="disabled")
        self.status.set("Startar Stockfish…")
        self.draw()
        def launch():
            if self.engine:
                self.engine.close()
            if not Path(STOCKFISH_PATH).is_file():
                raise FileNotFoundError(f"Stockfish saknas på {STOCKFISH_PATH}")
            return chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        def ready(engine):
            self.engine = engine
            self.game_log = GameLog(LOG_PATH, self.human, self.abs_limit, self.rel_limit)
            self.game_log.game.headers["EngineMaxMoveTime"] = (
                str(self.engine_time_limit) if self.engine_time_limit is not None else "auto")
            self.save_log()
            self.active = True
            self.next_turn()
        self.submit(launch, ready)

    def next_turn(self):
        if self.board.is_game_over():
            outcome = self.board.outcome()
            result = "Remi" if outcome.winner is None else ("Du vann" if outcome.winner == self.human else "Du förlorade")
            self.finish(f"{result}: {outcome.termination.name.lower()} ({outcome.result()}).", outcome.result(), "normal")
            return
        self.clocks[self.board.turn].start()
        if self.board.turn == self.human:
            self.status.set("Ditt drag." + (" Schack!" if self.board.is_check() else ""))
        else:
            self.status.set("Stockfish tänker…")
            position = self.board.copy()
            limit = chess.engine.Limit(time=self.engine_time_limit,
                                       white_clock=max(.001, self.clocks[chess.WHITE].value()),
                                       black_clock=max(.001, self.clocks[chess.BLACK].value()),
                                       white_inc=10, black_inc=10)
            self.submit(lambda: self.engine.play(position, limit), self.engine_moved)

    def engine_moved(self, result):
        if not self.active:
            return
        if self.check_timeout():
            return
        self.clocks[self.board.turn].stop(increment=True)
        if result.move is None or result.move not in self.board.legal_moves:
            self.finish("Stockfish kunde inte leverera ett giltigt drag.")
            return
        before = self.board.copy()
        self.board.push(result.move)
        self.record_move(result.move)
        self.draw()
        self.analyse_move(before, result.move)

    def click(self, event):
        if (not self.active and self.review is None) or self.busy or self.board.turn != self.human:
            return
        if self.check_timeout():
            return
        col, row = event.x // CELL, event.y // CELL
        if not (0 <= col < 8 and 0 <= row < 8):
            return
        square = chess.square(col if self.human else 7-col, 7-row if self.human else row)
        piece = self.board.piece_at(square)
        if piece and piece.color == self.human:
            self.selected = square
            self.draw()
            return
        if self.selected is None:
            return
        candidates = [m for m in self.board.legal_moves if m.from_square == self.selected and m.to_square == square]
        if not candidates:
            self.status.set("Ogiltigt drag. Välj en markerad målruta.")
            return
        move = candidates[0]
        if move.promotion:
            choice = simpledialog.askstring("Promovering", "Välj D (dam), T (torn), L (löpare) eller S (springare):", parent=self.root)
            promotions = {"D": chess.QUEEN, "T": chess.ROOK, "L": chess.BISHOP, "S": chess.KNIGHT}
            promotion = promotions.get((choice or "").strip().upper())
            if promotion is None:
                return
            move = chess.Move(self.selected, square, promotion=promotion)
        if self.review is not None:
            self.try_review_move(move)
            return
        if not self.active or self.check_timeout():
            return
        self.clocks[self.human].stop(increment=True)
        before = self.board.copy()
        self.board.push(move)
        self.record_move(move)
        self.selected = None
        self.draw()
        self.analyse_move(before, move)

    def record_move(self, move):
        before = self.board.copy()
        before.pop()
        self.update_history(before, move)
        if self.game_log:
            self.game_log.move(move, self.clocks[not self.board.turn].value())
            self.save_log()

    def analyse_move(self, before, move):
        self.status.set("Analyserar draget och bästa alternativet… Klockorna är pausade.")
        after = self.board.copy()
        def evaluate():
            limit = chess.engine.Limit(depth=18, time=ANALYSIS_TIME_LIMIT)
            best = self.engine.analyse(before, limit)
            if after.is_game_over():
                outcome = after.outcome()
                score = chess.engine.Mate(0) if outcome.winner is not None else chess.engine.Cp(0)
                played = {"score": chess.engine.PovScore(score, after.turn)}
            else:
                played = self.engine.analyse(before, limit, root_moves=[move])
            scores = tuple(info["score"].pov(self.human).score(mate_score=MATE_CP) for info in (best, played))
            return before, move, best["pv"][0], scores, best, played
        self.submit(evaluate, self.evaluated)

    def evaluated(self, result):
        before, move, best_move, (best, played), best_info, played_info = result
        if self.game_log:
            self.game_log.annotate(best_move, best_info, played_info)
            self.save_log()
        reason = loss_reason(best, played, self.abs_limit, self.rel_limit)
        is_loss = self.active and before.turn == self.human and reason and not self.board.is_game_over()
        self.update_history(before, move, best_move, best_info, played_info, hide_best=bool(is_loss))
        if not self.active:
            return
        if is_loss:
            self.finish("Du förlorade! " + reason, "0-1" if self.human else "1-0", "adjudication")
            self.review = dict(move=move, best_move=best_move, best=best, played=played,
                               best_info=best_info, played_info=played_info)
            self.board = before
            self.selected = None
            self.review_text.set(
                f"Ställningen före misstaget. Du spelade {before.san(move)} ({played:+d} cp). "
                "Försök hitta ett bättre drag på brädet, eller visa svaret. Klockorna står stilla.")
            self.reveal_button.configure(state="normal")
            self.draw()
        else:
            self.next_turn()

    def update_history(self, before, move, best_move=None, best_info=None, played_info=None, hide_best=False):
        row = str(before.fullmove_number)
        if not self.history.exists(row):
            self.history.insert("", "end", iid=row, values=(row,) + ("",) * 8,
                                tags=("alternate",) if before.fullmove_number % 2 == 0 else ())
        side = "white" if before.turn else "black"
        self.history.set(row, side, before.san(move))
        if played_info is None:
            self.history.set(row, side + "_eval", "Analyserar…")
        else:
            def display(info):
                score = info["score"].pov(self.human)
                return f"#{score.mate():+d}" if score.is_mate() else f"{score.score():+d} cp"
            self.history.set(row, side + "_eval", display(played_info))
            different = best_move != move
            self.history.set(row, side + "_best", "Dolt" if hide_best and different
                             else before.san(best_move) if different else "—")
            self.history.set(row, side + "_best_eval", "Dolt" if hide_best and different
                             else display(best_info) if different else "—")
        self.history.see(row)

    def save_log(self):
        if self.game_log:
            try:
                self.game_log.save()
                self.log_status.set(f"Sparat i {self.game_log.path}")
            except (OSError, ValueError) as exc:
                self.log_status.set(f"Kunde inte spara PGN: {exc}")

    def reveal_answer(self):
        if self.review is None or self.busy:
            return
        review = self.review
        move = review["best_move"]
        self.update_history(self.board, review["move"], move, review["best_info"], review["played_info"])
        self.review_text.set(
            f"Ditt drag: {self.board.san(review['move'])} ({review['played']:+d} cp). "
            f"Stockfishs bästa drag: {self.board.san(move)} "
            f"({chess.square_name(move.from_square)}–{chess.square_name(move.to_square)}), "
            f"{review['best']:+d} cp. Tapp: {max(0, review['best'] - review['played'])} cp. "
            "Starta ett nytt parti när du är redo.")
        self.selected = move.from_square
        self.draw()

    def try_review_move(self, move):
        self.selected = None
        self.draw()
        if move == self.review["best_move"]:
            self.reveal_answer()
            self.review_text.set("Rätt! Du hittade Stockfishs bästa drag. " + self.review_text.get())
            return
        before = self.board.copy()
        review = self.review
        self.review_text.set(f"Analyserar ditt försök {before.san(move)}…")
        self.reveal_button.configure(state="disabled")
        self.start_button.configure(state="disabled")
        def evaluate_attempt():
            info = self.engine.analyse(before, chess.engine.Limit(depth=18, time=ANALYSIS_TIME_LIMIT), root_moves=[move])
            return info["score"].pov(self.human).score(mate_score=MATE_CP)
        def attempted(score):
            improvement = score - review["played"]
            feedback = (f"En förbättring med {improvement} cp!" if improvement > 0
                        else "Det förbättrar inte värderingen av ditt ursprungliga drag.")
            self.review_text.set(
                f"Ditt försök: {before.san(move)} ({score:+d} cp). {feedback} "
                "Du kan försöka igen eller visa Stockfishs svar.")
            self.reveal_button.configure(state="normal")
        self.submit(evaluate_attempt, attempted)

    def finish(self, text, result="*", termination="unterminated"):
        was_active = self.active
        self.active = False
        for clock in self.clocks.values():
            clock.stop()
        self.status.set(text)
        if self.game_log and was_active:
            self.game_log.finish(result, termination, text)
            self.save_log()
        if not self.busy:
            self.start_button.configure(state="normal")

    def resign(self):
        if self.active:
            self.finish("Du gav upp. Stockfish vann.", "0-1" if self.human else "1-0", "normal")

    def claim_draw(self):
        if self.active and not self.busy and self.board.turn == self.human:
            if self.board.can_claim_draw():
                self.finish("Remi genom krav enligt femtiodragsregeln eller trefaldig upprepning.", "1/2-1/2", "normal")
            else:
                self.status.set("Du kan inte kräva remi i denna ställning.")

    def check_timeout(self):
        if self.active and self.clocks[self.board.turn].value() <= 0:
            loser = self.board.turn
            if self.board.has_insufficient_material(not loser):
                self.finish("Remi: tiden tog slut men motståndaren saknar mattmaterial.", "1/2-1/2", "time forfeit")
            else:
                self.finish("Din tid tog slut. Du förlorade." if loser == self.human else "Stockfish tid tog slut. Du vann!",
                            "0-1" if loser else "1-0", "time forfeit")
            return True
        return False

    def poll(self):
        self.check_timeout()
        try:
            while True:
                generation, callback, result, error = self.events.get_nowait()
                if generation != self.generation:
                    if isinstance(result, chess.engine.SimpleEngine):
                        result.close()
                    continue
                self.busy = False
                if error:
                    self.finish("Motorfel: " + error)
                    if self.review is not None:
                        self.review_text.set("Försöket kunde inte analyseras. Försök igen eller visa det sparade svaret.")
                        self.reveal_button.configure(state="normal")
                else:
                    callback(result)
                if not self.active and not self.busy:
                    self.start_button.configure(state="normal")
        except queue.Empty:
            pass
        def formatted(color):
            seconds = max(0, int(self.clocks[color].value()))
            return f"{seconds // 60:02}:{seconds % 60:02}"
        self.clock_text.set(f"Vit  {formatted(chess.WHITE)}       Svart  {formatted(chess.BLACK)}       15+10")
        self.root.after(50, self.poll)

    def draw(self):
        self.canvas.delete("all")
        opponent_squares = set()
        if self.board.move_stack and self.board.turn == self.human:
            move = self.board.peek()
            opponent_squares = {move.from_square, move.to_square}
        targets = {m.to_square for m in self.board.legal_moves if m.from_square == self.selected}
        for row in range(8):
            for col in range(8):
                square = chess.square(col if self.human else 7-col, 7-row if self.human else row)
                x, y = col*CELL, row*CELL
                color = "#f0d9b5" if (row+col) % 2 == 0 else "#b58863"
                if square in opponent_squares:
                    color = "#cdd26a" if (row+col) % 2 == 0 else "#aaa23a"
                if square == self.selected:
                    color = "#f6e05e"
                self.canvas.create_rectangle(x, y, x+CELL, y+CELL, fill=color, outline="")
                if square in targets:
                    self.canvas.create_oval(x+25, y+25, x+45, y+45, fill="#779955", outline="")
                piece = self.board.piece_at(square)
                if piece:
                    self.canvas.create_image(x+CELL/2, y+CELL/2,
                                             image=self.piece_images[piece.color, piece.piece_type])

    def close(self):
        if self.active:
            self.finish("Partiet avbröts när fönstret stängdes.")
        else:
            self.save_log()
        self.generation += 1
        if self.engine:
            self.engine.close()
        self.root.destroy()


if __name__ == "__main__":
    root = create_window()
    App(root)
    root.mainloop()
