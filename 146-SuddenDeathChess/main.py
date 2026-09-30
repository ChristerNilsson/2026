"""Run with python main.py. Stockfish is installed separately."""
import os
import math
import random
import queue
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, simpledialog, ttk

import chess
import chess.engine

from rules import loss_reason
from game_log import GameLog
from move_table import MoveTable
from settings import DEFAULTS, DEPTH_VALUES, load_settings, save_settings

CELL = 70
MATE_CP = 100000
ANALYSIS_TIME_LIMIT = 1.0
ANALYSIS_DEPTH_LIMIT = 20
STOCKFISH_PATH = r"C:\Program Files\stockfish\stockfish-windows-x86-64-avx2.exe"
PIECE_DIRECTORY = Path(__file__).resolve().parent / "assets" / "pieces" / "cburnett"
LOG_PATH = Path(__file__).resolve().parent / "logg.pgn"
SETTINGS_PATH = Path(__file__).resolve().parent / "settings.json"


def create_window():
    # Some Windows virtual environments do not locate the base install's Tcl.
    if sys.platform == "win32":
        tcl = Path(sys.base_prefix) / "tcl"
        for variable, folder in (("TCL_LIBRARY", "tcl8.6"), ("TK_LIBRARY", "tk8.6")):
            if (tcl / folder).is_dir():
                os.environ.setdefault(variable, str(tcl / folder))
    return tk.Tk()


class App:
    def __init__(self, root, settings_path=SETTINGS_PATH):
        self.root = root
        self.settings_path = settings_path
        self.piece_images = {
            (color, piece_type): tk.PhotoImage(
                master=root,
                file=str(PIECE_DIRECTORY / f"{'w' if color else 'b'}{chess.piece_symbol(piece_type).upper()}.png"))
            for color in chess.COLORS for piece_type in chess.PIECE_TYPES
        }
        root.title("Sudden Death Chess")
        self.board = chess.Board()
        self.human = chess.WHITE
        self.engine = None
        self.active = False
        self.busy = False
        self.generation = 0
        self.selected = None
        self.review = None
        self.hearts = 5
        self.total_hearts = 5
        self.absolute_mistakes = 0
        self.heart_animation = None
        self.game_log = None
        self.events = queue.Queue()
        self.absolute = tk.StringVar(value="300")
        self.relative = tk.StringVar(value="100")
        self.max_time = tk.StringVar(value="1")
        self.engine_time_limit = 1.0
        self.color = tk.StringVar(value="Slumpa")
        self.starting_hearts = tk.StringVar(value="5")
        self.max_depth = tk.StringVar(value="18")
        self.engine_depth_limit = 18
        for key, value in load_settings(self.settings_path).items():
            getattr(self, key).set(value)
        self.status = tk.StringVar()
        self.hearts = self.total_hearts = int(self.starting_hearts.get())
        self.heart_text = tk.StringVar(value=" ".join(["♥"] * self.hearts))
        self.engine_stats = tk.StringVar(value="Senaste datordrag\nSökdjup: —\nNoder: —\nSöktid: —")
        self.analysis_stats = tk.StringVar(value="Analys: bäst / utfört\nSökdjup: — / —\nNoder: — / —\nSöktid: — / —")
        self.starting_hearts.trace_add("write", lambda *_: self.preview_hearts())
        panel = ttk.Frame(root, padding=12)
        panel.pack(fill="both", expand=True)
        history_panel = ttk.Frame(panel, width=640)
        self.history_panel = history_panel
        history_panel.grid(row=1, column=2, rowspan=3, padx=(12, 0), sticky="nsew")
        panel.columnconfigure(2, weight=1)
        history_panel.columnconfigure(0, weight=1)
        history_panel.rowconfigure(0, weight=1)
        columns = ("nr", "white", "white_eval", "white_best", "white_best_eval",
                   "black", "black_eval", "black_best", "black_best_eval")
        self.history = MoveTable(history_panel, columns=columns, show="headings", height=26)
        self.history.configure(displaycolumns=("white_best_eval", "white_best", "white_eval", "white",
                                                "nr", "black", "black_eval", "black_best", "black_best_eval"))
        headings = ("Nr", "Vit", "Värde", "Bäst", "Värde",
                    "Svart", "Värde", "Bäst", "Värde")
        for column, heading in zip(columns, headings):
            self.history.heading(column, text=heading)
            self.history.column(column, width=40 if column == "nr" else 85,
                                minwidth=40, anchor="center")
        self.history.tag_configure("alternate", background="#f0f3f5")
        self.history.grid(row=0, column=0, sticky="nsew")
        history_scroll = ttk.Scrollbar(history_panel, command=self.history.yview)
        history_scroll.grid(row=0, column=1, sticky="ns")
        history_horizontal = ttk.Scrollbar(history_panel, orient="horizontal", command=self.history.xview)
        history_horizontal.grid(row=1, column=0, sticky="ew")
        self.history.configure(yscrollcommand=history_scroll.set, xscrollcommand=history_horizontal.set)
        candidates_panel = ttk.LabelFrame(history_panel, text="Motståndarens kandidatdrag – djup 1", padding=6)
        candidates_panel.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        candidates_panel.columnconfigure(0, weight=1)
        self.candidates = ttk.Treeview(candidates_panel, columns=("move", "score", "played", "pv"),
                                      show="headings", height=6)
        for column, title in (("move", "Drag"), ("score", "Värde (+ vit)"), ("played", "Utfört")):
            self.candidates.heading(column, text=title)
            self.candidates.column(column, width=100, anchor="center")
        self.candidates.heading("pv", text="Huvudlinje")
        self.candidates.column("pv", width=360, minwidth=120, anchor="w")
        self.candidates.grid(row=0, column=0, sticky="ew")
        candidate_scroll = ttk.Scrollbar(candidates_panel, command=self.candidates.yview)
        candidate_scroll.grid(row=0, column=1, sticky="ns")
        self.candidates.configure(yscrollcommand=candidate_scroll.set)
        candidate_horizontal = ttk.Scrollbar(candidates_panel, orient="horizontal", command=self.candidates.xview)
        candidate_horizontal.grid(row=1, column=0, sticky="ew")
        self.candidates.configure(xscrollcommand=candidate_horizontal.set)
        ttk.Label(candidates_panel, text="Separat analys, inte en lista över besökta noder.").grid(
            row=2, column=0, columnspan=2, sticky="w")
        settings = ttk.LabelFrame(panel, text="Inställningar", padding=12)
        settings.grid(row=0, column=0, rowspan=4, sticky="ns", padx=(0, 12))

        self.setting_widgets = []

        def setting(label, variable, unit="", values=None, readonly=False):
            ttk.Label(settings, text=label).pack(anchor="w", pady=(8, 2))
            field = ttk.Frame(settings)
            field.pack(fill="x", pady=(0, 4))
            if values is None:
                widget = ttk.Entry(field, textvariable=variable, width=9)
            else:
                widget = ttk.Combobox(field, textvariable=variable, values=values,
                                      width=9, state="readonly" if readonly else "normal")
            widget.pack(side="left")
            self.setting_widgets.append((widget, "readonly" if readonly else "normal"))
            if unit:
                ttk.Label(field, text=unit).pack(side="left", padx=(5, 0))

        setting("Absolut gräns", self.absolute, "centipawn")
        setting("Relativ gräns", self.relative, "centipawn")
        setting("Färg", self.color, values=("Slumpa", "Vit", "Svart"), readonly=True)
        setting("Hjärtan", self.starting_hearts, values=tuple(str(n) for n in range(1, 8)), readonly=True)
        setting("Max sökdjup", self.max_depth, values=DEPTH_VALUES, readonly=True)
        setting("Max", self.max_time, "sek/drag",
                ("0.001", "0.002", "0.005", "0.01", "0.02", "0.05",
                 "0.1", "0.2", "0.5", "1", "2", "5"), readonly=True)
        self.start_button = ttk.Button(settings, text="Starta parti", command=self.start)
        self.start_button.pack(fill="x", pady=(16, 4))
        ttk.Button(settings, text="Ge upp", command=self.resign).pack(fill="x", pady=4)
        ttk.Button(settings, text="Kräv remi", command=self.claim_draw).pack(fill="x", pady=4)
        stats_panel = ttk.Frame(settings)
        stats_panel.pack(side="bottom", anchor="w", pady=(20, 0))
        ttk.Label(stats_panel, textvariable=self.engine_stats, justify="left").pack(anchor="w")
        ttk.Label(stats_panel, textvariable=self.analysis_stats, justify="left").pack(anchor="w", pady=(12, 0))

        clocks = ttk.Frame(panel)
        clocks.grid(row=0, column=1, sticky="ew")
        tk.Label(clocks, textvariable=self.heart_text, fg="#c62828",
                 font=("Segoe UI Symbol", 18)).pack(side="right")
        self.canvas = tk.Canvas(panel, width=8*CELL, height=8*CELL, highlightthickness=0)
        self.canvas.grid(row=1, column=1, pady=8, sticky="n")
        self.canvas.bind("<Button-1>", self.click)
        root.bind("<Escape>", self.clear_selection)
        ttk.Label(panel, textvariable=self.status, wraplength=560).grid(row=2, column=1, sticky="nw")
        self.review_text = tk.StringVar()
        self.log_status = tk.StringVar()
        self.log_error = ttk.Label(panel, textvariable=self.log_status, wraplength=560)
        self.log_error.grid(row=3, column=1, sticky="nw")
        self.log_error.grid_remove()
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

    def preview_hearts(self):
        if not self.active and self.starting_hearts.get() in tuple(str(n) for n in range(1, 8)):
            self.heart_text.set(" ".join(["♥"] * int(self.starting_hearts.get())))

    def lock_settings(self, locked):
        for widget, original_state in self.setting_widgets:
            widget.configure(state="disabled" if locked else original_state)

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
            time_limit = float(value)
            if not math.isfinite(time_limit) or not 0.001 <= time_limit <= 5:
                raise ValueError
        except ValueError:
            messagebox.showerror("Ogiltig betänketid", "Välj en tid mellan 0,001 och 5 sekunder.")
            return
        if self.starting_hearts.get() not in tuple(str(n) for n in range(1, 8)):
            messagebox.showerror("Ogiltigt antal hjärtan", "Välj 1–7 hjärtan.")
            return
        if self.max_depth.get() not in DEPTH_VALUES:
            messagebox.showerror("Ogiltigt sökdjup", "Välj ett sökdjup i listan.")
            return
        self.engine_depth_limit = int(self.max_depth.get())
        self.persist_settings()
        self.generation += 1
        self.engine_time_limit = time_limit
        self.engine_stats.set("Senaste datordrag\nSökdjup: —\nNoder: —\nSöktid: —")
        for row in self.candidates.get_children():
            self.candidates.delete(row)
        self.analysis_stats.set("Analys: bäst / utfört\nSökdjup: — / —\nNoder: — / —\nSöktid: — / —")
        self.stop_heart_flash()
        self.hearts = self.total_hearts = int(self.starting_hearts.get())
        self.absolute_mistakes = 0
        self.heart_text.set(" ".join(["♥"] * self.hearts))
        self.review = None
        self.review_text.set("")
        for row in self.history.get_children():
            self.history.delete(row)
        self.human = random.choice(chess.COLORS) if self.color.get() == "Slumpa" else self.color.get() == "Vit"
        self.board.reset()
        self.selected = None
        self.start_button.configure(state="disabled")
        self.lock_settings(True)
        self.status.set("Startar partiet…")
        self.draw()
        def launch():
            if self.engine:
                self.engine.close()
            if not Path(STOCKFISH_PATH).is_file():
                raise FileNotFoundError(f"Stockfish saknas på {STOCKFISH_PATH}")
            return chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        def ready(engine):
            self.engine = engine
            self.game_log = GameLog(LOG_PATH, self.human, self.abs_limit, self.rel_limit, initial_seconds=None)
            self.game_log.game.headers["EngineMaxMoveTime"] = str(self.engine_time_limit)
            self.game_log.game.headers["EngineMaxDepth"] = str(self.engine_depth_limit)
            self.game_log.game.headers["StartingHearts"] = str(self.total_hearts)
            self.game_log.game.headers["AbsoluteLimitMultipliers"] = ",".join(str(n) for n in range(1, self.total_hearts + 1))
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
        if self.board.turn == self.human:
            self.status.set("Schack!" if self.board.is_check() else "")
        else:
            self.status.set("Datorn tänker…")
            position = self.board.copy()
            limit = chess.engine.Limit(time=self.engine_time_limit, depth=self.engine_depth_limit)
            self.submit(lambda: self.engine.play(position, limit, info=chess.engine.INFO_BASIC), self.engine_moved)

    def engine_moved(self, result):
        if not self.active:
            return
        info = result.info
        depth = str(info["depth"]) if "depth" in info else "—"
        nodes = f"{info['nodes']:,}".replace(",", " ") if "nodes" in info else "—"
        elapsed = f"{info['time']:.3f}".replace(".", ",") + " sek" if "time" in info else "—"
        self.engine_stats.set(f"Senaste datordrag\nSökdjup: {depth}\nNoder: {nodes}\nSöktid: {elapsed}")
        if result.move is None or result.move not in self.board.legal_moves:
            self.finish("Stockfish kunde inte leverera ett giltigt drag.")
            return
        before = self.board.copy()
        self.board.push(result.move)
        self.record_move(result.move)
        self.draw()
        self.analyse_move(before, result.move)

    def clear_selection(self, event=None):
        self.selected = None
        self.draw()

    def click(self, event):
        if (not self.active and self.review is None) or self.busy or self.board.turn != self.human:
            return
        col, row = event.x // CELL, event.y // CELL
        if not (0 <= col < 8 and 0 <= row < 8):
            return
        square = chess.square(col if self.human else 7-col, 7-row if self.human else row)
        piece = self.board.piece_at(square)
        if piece and piece.color == self.human:
            self.selected = None if self.selected == square else square
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
        if not self.active:
            return
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
            self.game_log.move(move, None)
            self.save_log()

    def analyse_move(self, before, move):
        self.status.set("Analyserar draget och bästa alternativet…")
        after = self.board.copy()
        def evaluate():
            candidates = None
            if before.turn != self.human:
                candidates = self.engine.analyse(before, chess.engine.Limit(depth=1, time=1),
                                                 multipv=before.legal_moves.count())
            limit = chess.engine.Limit(depth=ANALYSIS_DEPTH_LIMIT, time=ANALYSIS_TIME_LIMIT)
            best = self.engine.analyse(before, limit)
            if after.is_game_over():
                outcome = after.outcome()
                score = chess.engine.Mate(0) if outcome.winner is not None else chess.engine.Cp(0)
                played = {"score": chess.engine.PovScore(score, after.turn)}
            else:
                played = self.engine.analyse(before, limit, root_moves=[move])
            scores = tuple(info["score"].pov(self.human).score(mate_score=MATE_CP) for info in (best, played))
            return before, move, best["pv"][0], scores, best, played, candidates
        self.submit(evaluate, self.evaluated)

    def evaluated(self, result):
        before, move, best_move, (best, played), best_info, played_info = result[:6]
        if len(result) > 6 and result[6] is not None:
            self.show_candidates(before, move, result[6])
        self.show_analysis_stats(best_info, played_info)
        if self.game_log:
            self.game_log.annotate(best_move, best_info, played_info)
            self.save_log()
        absolute_hit = played < -self.abs_limit * (1 + self.absolute_mistakes)
        reason = loss_reason(best, played, self.abs_limit * (1 + self.absolute_mistakes), self.rel_limit)
        if absolute_hit:
            white_value = played if self.human else -played
            reason = f"Absolut gräns passerad: {white_value:+d} centipawn (ur vits perspektiv)."
        is_loss = self.active and before.turn == self.human and reason and not self.board.is_game_over()
        self.update_history(before, move, best_move, best_info, played_info)
        if not self.active:
            return
        if is_loss:
            self.hearts -= 1
            if absolute_hit:
                self.absolute_mistakes += 1
            self.heart_text.set(" ".join(["♥"] * self.hearts + ["♡"] * (self.total_hearts - self.hearts)))
            if self.game_log:
                self.game_log.undo_mistake(best_move, self.hearts)
                self.save_log()
            self.board = before
            self.selected = None
            self.history.set(str(before.fullmove_number), "white" if self.human else "black", before.san(move) + " ↶")
            side = "white" if self.human else "black"
            row = str(before.fullmove_number)
            self.history.set(row, side + "_best", before.san(best_move))
            self.history.color_cell(row, side, "#c62828")
            self.history.color_cell(row, side + "_best", "#188038")
            self.review_text.set(
                f"Tillbakadraget: {before.san(move)} ({played if self.human else -played:+d} centipawn). "
                f"Bästa drag: {before.san(best_move)} ({best if self.human else -best:+d} centipawn).")
            if self.hearts:
                threshold = self.abs_limit * (1 + self.absolute_mistakes) * (-1 if self.human else 1)
                self.status.set(f"Ett hjärta förlorat. {reason} Försök igen. Absolut gräns nu: {threshold:+d} centipawn.")
            else:
                self.finish("Du förlorade ditt sista hjärta! " + reason,
                            "0-1" if self.human else "1-0", "adjudication")
                self.review = dict(move=move, best_move=best_move, best=best, played=played,
                                   best_info=best_info, played_info=played_info)
            self.draw()
            self.flash_heart()
        else:
            self.next_turn()

    def stop_heart_flash(self):
        if self.heart_animation is not None:
            self.root.after_cancel(self.heart_animation)
            self.heart_animation = None
        self.canvas.delete("heart_flash")

    def flash_heart(self):
        self.stop_heart_flash()
        self.canvas.create_text(4*CELL, 4*CELL, text="♥", fill="#c62828",
                                font=("Segoe UI Symbol", 240), tags="heart_flash")
        self.heart_animation = self.root.after(800, self.stop_heart_flash)

    def show_candidates(self, before, played, infos):
        for row in self.candidates.get_children():
            self.candidates.delete(row)
        scores = {info["pv"][0]: info["score"].white() for info in infos
                  if info.get("pv") and "score" in info}
        lines = {info["pv"][0]: before.variation_san(info["pv"]) for info in infos if info.get("pv")}
        moves = list(scores) + [move for move in before.legal_moves if move not in scores]
        for move in moves:
            score = scores.get(move)
            value = ("—" if score is None else f"#{score.mate():+d}" if score.is_mate()
                     else f"{score.score():+d}")
            self.candidates.insert("", "end", values=(before.san(move), value,
                                                       "✓" if move == played else "", lines.get(move, "")))

    def show_analysis_stats(self, best_info, played_info=None):
        infos = [best_info] if played_info is None else [best_info, played_info]
        depths = " / ".join(str(info.get("depth", "—")) for info in infos)
        nodes = " / ".join(f"{info['nodes']:,}".replace(",", " ") if "nodes" in info else "—" for info in infos)
        times = " / ".join(f"{info['time']:.3f}".replace(".", ",") + " sek" if "time" in info else "—" for info in infos)
        title = "Analys: försök" if played_info is None else "Analys: bäst / utfört"
        self.analysis_stats.set(f"{title}\nSökdjup: {depths}\nNoder: {nodes}\nSöktid: {times}")

    def update_history(self, before, move, best_move=None, best_info=None, played_info=None, hide_best=False):
        row = str(before.fullmove_number)
        if not self.history.exists(row):
            self.history.insert("", "end", iid=row, values=(row,) + ("",) * 8,
                                tags=("alternate",) if before.fullmove_number % 2 == 0 else ())
            for column in ("white_eval", "white_best_eval", "black_eval", "black_best_eval"):
                self.history.color_cell(row, column, "#707070")
        side = "white" if before.turn else "black"
        self.history.set(row, side, before.san(move))
        if played_info is None:
            self.history.color_cell(row, side, None)
            self.history.color_cell(row, side + "_best", None)
            self.history.set(row, side + "_eval", "Analyserar…")
            self.history.set(row, side + "_best", "")
            self.history.set(row, side + "_best_eval", "")
        else:
            def display(info):
                score = info["score"].white()
                return f"#{score.mate():+d}" if score.is_mate() else f"{score.score():+d}"
            self.history.set(row, side + "_eval", display(played_info))
            different = best_move != move
            self.history.set(row, side + "_best", "Dolt" if hide_best and different
                             else before.san(best_move) if different else "")
            self.history.set(row, side + "_best_eval", "Dolt" if hide_best and different
                             else display(best_info) if different else "")
        self.history.see(row)

    def save_log(self):
        if self.game_log:
            try:
                self.game_log.save()
                self.log_status.set("")
                self.log_error.grid_remove()
            except (OSError, ValueError) as exc:
                self.log_status.set(f"Kunde inte spara PGN: {exc}")
                self.log_error.grid()

    def reveal_answer(self):
        if self.review is None or self.busy:
            return
        review = self.review
        move = review["best_move"]
        self.update_history(self.board, review["move"], move, review["best_info"], review["played_info"])
        self.review_text.set(
            f"Ditt drag: {self.board.san(review['move'])} ({review['played'] if self.human else -review['played']:+d} centipawn). "
            f"Stockfishs bästa drag: {self.board.san(move)} "
            f"({chess.square_name(move.from_square)}–{chess.square_name(move.to_square)}), "
            f"{review['best'] if self.human else -review['best']:+d} centipawn. Tapp: {max(0, review['best'] - review['played'])} centipawn. "
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
        self.start_button.configure(state="disabled")
        def evaluate_attempt():
            info = self.engine.analyse(before, chess.engine.Limit(depth=ANALYSIS_DEPTH_LIMIT, time=ANALYSIS_TIME_LIMIT), root_moves=[move])
            return info
        def attempted(info):
            self.show_analysis_stats(info)
            score = info["score"].pov(self.human).score(mate_score=MATE_CP)
            improvement = score - review["played"]
            feedback = (f"En förbättring med {improvement} centipawn!" if improvement > 0
                        else "Det förbättrar inte värderingen av ditt ursprungliga drag.")
            self.review_text.set(
                f"Ditt försök: {before.san(move)} ({score if self.human else -score:+d} centipawn). {feedback} "
                "Du kan försöka igen eller visa Stockfishs svar.")
        self.submit(evaluate_attempt, attempted)

    def finish(self, text, result="*", termination="unterminated"):
        self.lock_settings(False)
        was_active = self.active
        self.active = False
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

    def poll(self):
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
                else:
                    callback(result)
                if not self.active and not self.busy:
                    self.start_button.configure(state="normal")
        except queue.Empty:
            pass
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

    def persist_settings(self):
        try:
            save_settings(self.settings_path, {key: getattr(self, key).get() for key in DEFAULTS})
        except OSError as exc:
            messagebox.showerror("Inställningarna kunde inte sparas", str(exc), parent=self.root)

    def close(self):
        self.persist_settings()
        self.stop_heart_flash()
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
