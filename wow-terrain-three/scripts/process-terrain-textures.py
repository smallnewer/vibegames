"""把 AI 原图整理成尺寸统一、可平铺的地形贴图。"""

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "terrain-sources"
TEXTURE_DIR = ROOT / "public" / "textures"
SIZE = 1024
SEAM_WIDTH = 112

TEXTURES = {
    "terrain-grass-master.png": "terrain-grass.png",
    "terrain-dirt-source.png": "terrain-dirt.png",
    "terrain-stone-road-source.png": "terrain-road.png",
    "terrain-rock-source.png": "terrain-rock.png",
    "terrain-sand-source.png": "terrain-sand.png",
    "water-surface-source.png": "water-surface.png",
}


def blend_horizontal_edges(image: Image.Image) -> Image.Image:
    """让左右边缘逐像素一致，同时把修补限制在窄边带内。"""
    result = image.copy()
    pixels = result.load()
    for distance in range(SEAM_WIDTH):
        strength = (1 - distance / SEAM_WIDTH) ** 2
        left_x = distance
        right_x = SIZE - 1 - distance
        for y in range(SIZE):
            left = pixels[left_x, y]
            right = pixels[right_x, y]
            middle = tuple((left[channel] + right[channel]) // 2 for channel in range(3))
            pixels[left_x, y] = tuple(
                round(left[channel] * (1 - strength) + middle[channel] * strength)
                for channel in range(3)
            )
            pixels[right_x, y] = tuple(
                round(right[channel] * (1 - strength) + middle[channel] * strength)
                for channel in range(3)
            )
    return result


def blend_vertical_edges(image: Image.Image) -> Image.Image:
    """用同样方式缝合上下边缘；角落会自然保持一致。"""
    result = image.copy()
    pixels = result.load()
    for distance in range(SEAM_WIDTH):
        strength = (1 - distance / SEAM_WIDTH) ** 2
        top_y = distance
        bottom_y = SIZE - 1 - distance
        for x in range(SIZE):
            top = pixels[x, top_y]
            bottom = pixels[x, bottom_y]
            middle = tuple((top[channel] + bottom[channel]) // 2 for channel in range(3))
            pixels[x, top_y] = tuple(
                round(top[channel] * (1 - strength) + middle[channel] * strength)
                for channel in range(3)
            )
            pixels[x, bottom_y] = tuple(
                round(bottom[channel] * (1 - strength) + middle[channel] * strength)
                for channel in range(3)
            )
    return result


def process(source_name: str, output_name: str) -> None:
    source = Image.open(SOURCE_DIR / source_name).convert("RGB")

    # 1. 从中心裁成正方形，再缩到 GPU 友好的 2 次幂尺寸。
    side = min(source.size)
    left = (source.width - side) // 2
    top = (source.height - side) // 2
    image = source.crop((left, top, left + side, top + side))
    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

    # 2. 稍微压低对比和饱和度，避免不同材质拼起来互相打架。
    image = ImageEnhance.Contrast(image).enhance(0.94)
    image = ImageEnhance.Color(image).enhance(0.92)
    if output_name == "terrain-road.png":
        image = ImageEnhance.Brightness(image).enhance(1.08)

    # 3. 让四条边真正连续，交给 Three.js 重复采样。
    image = blend_horizontal_edges(image)
    image = blend_vertical_edges(image)
    image.save(TEXTURE_DIR / output_name, optimize=True)


if __name__ == "__main__":
    for source_name, output_name in TEXTURES.items():
        process(source_name, output_name)
