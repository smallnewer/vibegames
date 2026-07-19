"""Combine four Blender renders into one no-overlap approval sheet."""

from pathlib import Path
import os

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
PREVIEW_DIR = ROOT_DIR / "assets" / "characters" / "previews"
VIEW_NAMES = ("front", "side", "back", "three-quarter")
BUILD_MODE = os.environ.get("BOVINE_BUILD_MODE", "graybox")
ASSET_STEM = "bovine-hero-graybox" if BUILD_MODE == "graybox" else "bovine-hero-runtime"
OUTPUT_PATH = PREVIEW_DIR / f"{ASSET_STEM}-turnaround.png"


def main() -> None:
    """Place each complete view in its own 640-pixel column."""
    images = [Image.open(PREVIEW_DIR / f"{ASSET_STEM}-{name}.png").convert("RGB") for name in VIEW_NAMES]
    width = sum(image.width for image in images)
    height = max(image.height for image in images)
    canvas = Image.new("RGB", (width, height), (164, 168, 173))
    x = 0
    for image in images:
        canvas.paste(image, (x, 0))
        x += image.width
    canvas.save(OUTPUT_PATH, optimize=True)
    print(f"GRAYBOX_PREVIEW path={OUTPUT_PATH} size={canvas.size}")


if __name__ == "__main__":
    main()
