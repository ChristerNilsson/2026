"""Sudden-death rules, always measured from the human player's perspective."""
from dataclasses import dataclass
import time


def loss_reason(best: int, played: int, absolute: int, relative: int) -> str | None:
    if played < -absolute:
        return f"Absolut gräns: {played:+d} centipawn understiger −{absolute} centipawn."
    if best - played > relative:
        return f"Relativ gräns: tappet {best - played} centipawn överstiger {relative} centipawn."
    return None


@dataclass
class Clock:
    remaining: float = 900.0
    started: float | None = None
    increment_seconds: float = 10.0

    def start(self):
        self.started = time.monotonic()

    def value(self):
        return self.remaining - (time.monotonic() - self.started if self.started is not None else 0)

    def stop(self, increment=False):
        self.remaining = max(0.0, self.value())
        self.started = None
        if increment and self.remaining > 0:
            self.remaining += self.increment_seconds
