import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FACES_DIR = ROOT / "faces"
OUTPUT_FILE = ROOT / "faces.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def display_name(path: Path) -> str:
    return path.stem.replace("_", " ")


def main() -> None:
    images = sorted(
        (
            path
            for path in FACES_DIR.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ),
        key=lambda path: path.name.casefold(),
    )

    faces = [
        {
            "name": display_name(path),
            "image": path.relative_to(ROOT).as_posix(),
        }
        for path in images
    ]

    OUTPUT_FILE.write_text(
        json.dumps(faces, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Skrev {len(faces)} personer till {OUTPUT_FILE.name}")


if __name__ == "__main__":
    main()
