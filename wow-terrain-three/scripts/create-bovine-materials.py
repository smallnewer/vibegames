"""Generate restrained seamless material tiles for the bovine hero."""

from math import pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageChops, ImageDraw


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "public" / "textures" / "characters" / "bovine-hero"
SIZE = 512

MATERIALS = {
    "fur.png": ((154, 88, 38), 17, 9),
    "muzzle.png": ((211, 164, 102), 12, 7),
    "leather.png": ((61, 42, 31), 10, 8),
    "cloth-teal.png": ((42, 83, 80), 11, 7),
    "mane.png": ((47, 30, 21), 9, 8),
    "horn.png": ((211, 184, 126), 10, 6),
    "hoof.png": ((47, 43, 39), 8, 6),
}


def clamp(value: float) -> int:
    """Keep generated color values inside the PNG byte range."""
    return max(0, min(255, round(value)))


def periodic_base(base: tuple[int, int, int], amount: int, seed: int) -> Image.Image:
    """Create low-frequency periodic value changes without dot noise."""
    random = Random(seed)
    waves = []
    for _ in range(6):
        waves.append(
            (
                random.randint(1, 4),
                random.randint(1, 4),
                random.random() * pi * 2,
                random.uniform(0.18, 0.42),
            )
        )

    pixels = []
    for y in range(SIZE):
        ny = y / SIZE
        for x in range(SIZE):
            nx = x / SIZE
            value = sum(sin((wave_x * nx + wave_y * ny) * pi * 2 + phase) * weight for wave_x, wave_y, phase, weight in waves)
            value *= amount / sum(abs(weight) for _, _, _, weight in waves)
            # Warm materials shift red slightly more than blue, like broad painted value changes.
            pixels.append((clamp(base[0] + value), clamp(base[1] + value * 0.84), clamp(base[2] + value * 0.68)))

    image = Image.new("RGB", (SIZE, SIZE))
    image.putdata(pixels)
    return image


def add_broad_strokes(image: Image.Image, base: tuple[int, int, int], count: int, seed: int) -> Image.Image:
    """Overlay a few wide soft strokes and repeat them across tile boundaries."""
    random = Random(seed)
    tiled = Image.new("RGB", (SIZE * 3, SIZE * 3))
    for tile_y in range(3):
        for tile_x in range(3):
            tiled.paste(image, (tile_x * SIZE, tile_y * SIZE))

    overlay = Image.new("RGBA", tiled.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        start_x = random.randint(0, SIZE)
        start_y = random.randint(0, SIZE)
        length = random.randint(130, 300)
        rise = random.randint(-80, 80)
        bend = random.randint(-45, 45)
        width = random.randint(24, 58)
        lift = random.choice((-1, 1)) * random.randint(7, 15)
        color = (
            clamp(base[0] + lift),
            clamp(base[1] + lift * 0.84),
            clamp(base[2] + lift * 0.68),
            random.randint(18, 34),
        )
        points = [
            (start_x, start_y),
            (start_x + length * 0.45, start_y + rise * 0.45 + bend),
            (start_x + length, start_y + rise),
        ]
        for offset_y in (0, SIZE, SIZE * 2):
            for offset_x in (0, SIZE, SIZE * 2):
                shifted = [(x + offset_x, y + offset_y) for x, y in points]
                draw.line(shifted, fill=color, width=width, joint="curve")

    painted = Image.alpha_composite(tiled.convert("RGBA"), overlay).convert("RGB")
    return painted.crop((SIZE, SIZE, SIZE * 2, SIZE * 2))


def force_exact_edges(image: Image.Image) -> Image.Image:
    """Make opposite edge pixels identical after all painted processing."""
    result = image.copy()
    pixels = result.load()
    for y in range(SIZE):
        left = pixels[0, y]
        right = pixels[SIZE - 1, y]
        merged = tuple((left[channel] + right[channel]) // 2 for channel in range(3))
        pixels[0, y] = merged
        pixels[SIZE - 1, y] = merged
    for x in range(SIZE):
        top = pixels[x, 0]
        bottom = pixels[x, SIZE - 1]
        merged = tuple((top[channel] + bottom[channel]) // 2 for channel in range(3))
        pixels[x, 0] = merged
        pixels[x, SIZE - 1] = merged
    corner = tuple(sum(pixels[x, y][channel] for x in (0, SIZE - 1) for y in (0, SIZE - 1)) // 4 for channel in range(3))
    for x in (0, SIZE - 1):
        for y in (0, SIZE - 1):
            pixels[x, y] = corner
    return result


def validate(path: Path) -> None:
    """Validate dimensions, mode and exact repeat edges."""
    image = Image.open(path).convert("RGB")
    assert image.size == (SIZE, SIZE), f"Unexpected size: {path} {image.size}"
    left = image.crop((0, 0, 1, SIZE))
    right = image.crop((SIZE - 1, 0, SIZE, SIZE))
    top = image.crop((0, 0, SIZE, 1))
    bottom = image.crop((0, SIZE - 1, SIZE, SIZE))
    assert ImageChops.difference(left, right).getbbox() is None, f"Horizontal seam: {path}"
    assert ImageChops.difference(top, bottom).getbbox() is None, f"Vertical seam: {path}"


def main() -> None:
    """Generate and validate all role-based character textures."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, (name, (base, amount, stroke_count)) in enumerate(MATERIALS.items(), start=1):
        image = periodic_base(base, amount, 2100 + index * 37)
        image = add_broad_strokes(image, base, stroke_count, 5100 + index * 53)
        image = force_exact_edges(image)
        path = OUTPUT_DIR / name
        image.save(path, optimize=True)
        validate(path)
    print(f"BOVINE_MATERIALS_VALID count={len(MATERIALS)} size={SIZE} dir={OUTPUT_DIR}")


if __name__ == "__main__":
    main()
