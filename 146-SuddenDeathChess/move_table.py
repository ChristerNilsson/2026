"""Treeview with independently colored text in selected cells."""
import tkinter as tk
from tkinter import ttk


class MoveTable(ttk.Treeview):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cell_labels = {}
        for event in ("<Configure>", "<Expose>", "<ButtonRelease-1>", "<KeyRelease>", "<MouseWheel>"):
            self.bind(event, lambda event: self.after_idle(self.refresh_colors), add=True)
        self.bind("<Configure>", lambda event: self.after_idle(self.show_latest), add=True)

    def show_latest(self):
        if self.winfo_exists() and self.get_children():
            self.yview_moveto(1.0)
            self.refresh_colors()

    def color_cell(self, row, column, color):
        key = (row, column)
        previous = self.cell_labels.pop(key, None)
        if previous:
            previous.destroy()
        if color:
            background = "#f0f3f5" if "alternate" in self.item(row, "tags") else "white"
            label = tk.Label(self, fg=color, bg=background, borderwidth=0,
                             font=ttk.Style(self).lookup("Treeview", "font") or "TkDefaultFont")
            label.bind("<MouseWheel>", lambda event: self.event_generate("<MouseWheel>", delta=event.delta))
            label.bind("<Button-1>", lambda event: self.selection_set(row))
            self.cell_labels[key] = label
        self.refresh_colors()

    def refresh_colors(self):
        if not self.winfo_exists():
            return
        for (row, column), label in self.cell_labels.items():
            bounds = self.bbox(row, column) if self.exists(row) else ()
            if not bounds:
                label.place_forget()
                continue
            x, y, width, height = bounds
            if x < 0 or x + width > self.winfo_width():
                label.place_forget()
                continue
            label.configure(text=self.set(row, column))
            label.place(x=x+1, y=y+1, width=max(1, width-2), height=max(1, height-2))
            label.lift()

    def set(self, item, column=None, value=None):
        result = super().set(item, column, value)
        if value is not None and (item, column) in self.cell_labels:
            self.cell_labels[item, column].configure(text=value)
        return result

    def delete(self, *items):
        for key in list(self.cell_labels):
            if key[0] in items:
                self.cell_labels.pop(key).destroy()
        return super().delete(*items)

    def yview(self, *args):
        result = super().yview(*args)
        self.after_idle(self.refresh_colors)
        return result

    def xview(self, *args):
        result = super().xview(*args)
        self.after_idle(self.refresh_colors)
        return result

    def see(self, item):
        super().see(item)
        self.after_idle(self.show_latest)
