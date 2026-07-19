"""Remove privacy-sensitive metadata chunks from PNG assets."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import tempfile
from typing import Iterable


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PRIVATE_METADATA_CHUNKS = {b"eXIf", b"iTXt", b"tEXt", b"zTXt"}


def without_private_metadata(data: bytes) -> tuple[bytes, bool]:
    """Return a PNG without EXIF/text chunks while preserving image chunks."""
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("Not a PNG file")

    output = bytearray(PNG_SIGNATURE)
    offset = len(PNG_SIGNATURE)
    changed = False
    saw_iend = False

    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("Truncated PNG chunk header")

        length = int.from_bytes(data[offset : offset + 4], "big")
        chunk_end = offset + 12 + length
        if chunk_end > len(data):
            raise ValueError("Truncated PNG chunk data")

        chunk_type = data[offset + 4 : offset + 8]
        if chunk_type in PRIVATE_METADATA_CHUNKS:
            changed = True
        else:
            output.extend(data[offset:chunk_end])

        offset = chunk_end
        if chunk_type == b"IEND":
            saw_iend = True
            break

    if not saw_iend:
        raise ValueError("PNG is missing IEND")
    if offset != len(data):
        raise ValueError("Unexpected bytes after PNG IEND")

    return bytes(output), changed


def strip_png_metadata(path: Path) -> bool:
    """Atomically strip private metadata from one PNG file."""
    original = path.read_bytes()
    sanitized, changed = without_private_metadata(original)
    if not changed:
        return False

    mode = path.stat().st_mode
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".metadata-clean",
            delete=False,
        ) as temporary:
            temporary.write(sanitized)
            temporary_path = Path(temporary.name)
        os.chmod(temporary_path, mode)
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()
    return True


def png_files(inputs: Iterable[Path]) -> list[Path]:
    """Resolve PNG files from a mixture of files and directories."""
    files: set[Path] = set()
    for item in inputs:
        if item.is_dir():
            files.update(path for path in item.rglob("*.png") if path.is_file())
        elif item.is_file() and item.suffix.lower() == ".png":
            files.add(item)
        else:
            raise FileNotFoundError(f"PNG input does not exist: {item}")
    return sorted(files)


def main() -> None:
    """Sanitize every PNG supplied on the command line."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()

    changed = 0
    files = png_files(args.paths)
    for path in files:
        changed += int(strip_png_metadata(path))
    print(f"PNG_METADATA files={len(files)} sanitized={changed}")


if __name__ == "__main__":
    main()
