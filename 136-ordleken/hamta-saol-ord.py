#!/usr/bin/env python3
"""Hämta en komplett, filtrerad SAOL-lista från svenska.se.

Programmet hämtar alla prefix under a–z, å, ä och ö. Sökningar som når
svenska.se:s gräns på 10 000 träffar delas automatiskt i mindre prefix.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path


API_URL = "https://svenska.se/api/msearch"
ALPHABET = "abcdefghijklmnopqrstuvwxyzåäö"
ALLOWED_WORD = re.compile(r"^[a-zåäö]+$")
ORDER = {letter: position for position, letter in enumerate(ALPHABET)}
PAGE_SIZE = 5_000
RESULT_WINDOW = 10_000
CACHE_VERSION = 1


def swedish_key(word: str) -> tuple[int, ...]:
    return tuple(ORDER[letter] for letter in word)


def request_hits(prefix: str, offset: int, size: int, exact: bool = False) -> dict:
    query = prefix if exact else f"{prefix}*"
    body = {
        "saol": {
            "index": "sa-svenska-saol",
            "query": query,
            "exact_match": exact,
            "from": offset,
            "size": size,
        },
        "so": {
            "index": "sa-svenska-so",
            "query": query,
            "exact_match": exact,
            "from": 0,
            "size": 0,
        },
        "saob": {
            "index": "sa-svenska-saob",
            "query": query,
            "exact_match": exact,
            "from": 0,
            "size": 0,
        },
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Ordleken-SAOL-hamtare/1.0",
        },
        method="POST",
    )

    for attempt in range(1, 8):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)["saol"]["hits"]
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == 7:
                raise RuntimeError(f"SAOL-anropet för {prefix!r} misslyckades") from error
            wait_seconds = min(2**attempt, 30)
            print(f"  Tillfälligt fel för {prefix!r}; försöker igen om {wait_seconds} s.")
            time.sleep(wait_seconds)

    raise AssertionError("Koden ska inte kunna nå denna rad")


def fetch_prefix(prefix: str, depth: int = 0) -> set[str]:
    probe = request_hits(prefix, 0, 1)
    total = int(probe["total"]["value"])
    relation = probe["total"].get("relation", "eq")

    if total >= RESULT_WINDOW or relation != "eq":
        print(f"{'  ' * depth}Delar {prefix!r} ({total}+ träffar)")
        words: set[str] = set()

        # Behåll även ordet som är identiskt med prefixet.
        exact = request_hits(prefix, 0, 30, exact=True)
        for hit in exact["hits"]:
            word = hit["_source"].get("ortografi", "")
            if word == prefix and ALLOWED_WORD.fullmatch(word):
                words.add(word)

        # Efter filtreringen kan nästa tecken bara vara ett av dessa 29.
        for next_letter in ALPHABET:
            words.update(fetch_prefix(prefix + next_letter, depth + 1))
        return words

    words: set[str] = set()
    for offset in range(0, total, PAGE_SIZE):
        size = min(PAGE_SIZE, total - offset)
        page = request_hits(prefix, offset, size)
        for hit in page["hits"]:
            word = hit["_source"].get("ortografi", "")
            if word.startswith(prefix) and ALLOWED_WORD.fullmatch(word):
                words.add(word)
    return words


def load_cache(path: Path, letter: str) -> set[str] | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != CACHE_VERSION or data.get("letter") != letter:
        return None
    words = data.get("words")
    if not isinstance(words, list):
        return None
    result = {word for word in words if ALLOWED_WORD.fullmatch(word)}
    return result if result else None


def save_cache(path: Path, letter: str, words: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    data = {
        "version": CACHE_VERSION,
        "letter": letter,
        "words": sorted(words, key=swedish_key),
    }
    temporary.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    os.replace(temporary, path)


def write_wordlist(path: Path, words: set[str]) -> None:
    ordered = sorted(words, key=swedish_key)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text("\n".join(ordered) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).with_name("saol-ord.txt"),
        help="Slutlig ordlista (standard: saol-ord.txt)",
    )
    parser.add_argument(
        "--cache",
        type=Path,
        default=Path(__file__).with_name(".saol-cache"),
        help="Kontrollpunktskatalog (standard: .saol-cache)",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Ignorera tidigare kontrollpunkter och hämta allt på nytt",
    )
    args = parser.parse_args()

    all_words: set[str] = set()
    for letter in ALPHABET:
        cache_path = args.cache / f"{ord(letter):04x}.json"
        letter_words = None if args.refresh else load_cache(cache_path, letter)

        if letter_words is None:
            print(f"Hämtar {letter}…")
            letter_words = fetch_prefix(letter)
            save_cache(cache_path, letter, letter_words)
            print(f"{letter}: {len(letter_words)} ord hämtade")
        else:
            print(f"{letter}: {len(letter_words)} ord från kontrollpunkt")

        all_words.update(letter_words)

    if not all_words:
        raise RuntimeError("Inga ord hämtades; den befintliga ordlistan ändras inte")

    write_wordlist(args.output, all_words)
    print(f"Klart: {len(all_words)} unika ord i {args.output.resolve()}")


if __name__ == "__main__":
    main()
