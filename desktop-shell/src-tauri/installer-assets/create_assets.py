from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
ICONS = ROOT.parent / "icons"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def radial_glow(size, center, radius, color=(0, 242, 255), alpha=150):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    px = layer.load()
    cx, cy = center
    for y in range(size[1]):
        for x in range(size[0]):
            distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            strength = max(0.0, 1.0 - distance / radius) ** 2
            px[x, y] = (*color, int(alpha * strength))
    return layer


def draw_ex_mark(canvas, box):
    draw = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = box
    mark_font = font(FONT_BOLD, int((y1 - y0) * 0.43))
    text = "EX"
    bbox = draw.textbbox((0, 0), text, font=mark_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x0 + (x1 - x0 - tw) / 2 - bbox[0]
    ty = y0 + (y1 - y0 - th) / 2 - bbox[1] - 3

    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).text((tx, ty), text, font=mark_font, fill=(255, 255, 255, 180), stroke_width=3)
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(5, int((y1 - y0) * 0.05)))))
    ImageDraw.Draw(canvas).text((tx, ty), text, font=mark_font, fill=(255, 255, 255, 255))


def glass_mark(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    center = size // 2
    canvas.alpha_composite(radial_glow((size, size), (center, center), size * 0.64))
    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(panel)
    radius = int(size * 0.24)
    d.rounded_rectangle(
        (int(size * 0.05), int(size * 0.05), int(size * 0.95), int(size * 0.95)),
        radius=radius,
        fill=(18, 35, 40, 230),
        outline=(92, 239, 246, 210),
        width=max(2, int(size * 0.012)),
    )
    canvas.alpha_composite(panel)
    draw_ex_mark(canvas, (int(size * 0.1), int(size * 0.1), int(size * 0.9), int(size * 0.9)))
    return canvas


def square_logo():
    size, mark_size = 1024, 880
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = (size - mark_size) // 2
    image.alpha_composite(glass_mark(mark_size), (offset, offset))
    return image


def sidebar_image():
    width, height = 164, 314
    image = Image.new("RGBA", (width, height), (5, 5, 5, 255))
    image.alpha_composite(radial_glow((width, height), (width // 2, 112), 150, alpha=100))
    mark = glass_mark(124)
    image.alpha_composite(mark, ((width - mark.width) // 2, 30))
    d = ImageDraw.Draw(image)
    small = font(FONT_REGULAR, 9)
    brand = font(FONT_BOLD, 13)
    product = font(FONT_REGULAR, 11)
    for text, f, y, color in [
        ("ENOSX AI", brand, 174, (255, 255, 255, 235)),
        ("from", small, 204, (255, 255, 255, 150)),
        ("Enosx Technologies", product, 220, (255, 255, 255, 225)),
    ]:
        bbox = d.textbbox((0, 0), text, font=f)
        d.text(((width - (bbox[2] - bbox[0])) / 2, y), text, font=f, fill=color)
    d.rectangle((0, height - 3, width, height), fill=(0, 242, 255, 235))
    return image.convert("RGB")


def header_image():
    width, height = 150, 57
    image = Image.new("RGBA", (width, height), (5, 5, 5, 255))
    image.alpha_composite(radial_glow((width, height), (22, 28), 75, alpha=90))
    d = ImageDraw.Draw(image)
    mark = glass_mark(42)
    image.alpha_composite(mark, (8, 7))
    d = ImageDraw.Draw(image)
    d.text((58, 16), "ENOSX AI", font=font(FONT_BOLD, 13), fill=(255, 255, 255, 240))
    d.text((58, 33), "ENOSX TECHNOLOGIES", font=font(FONT_REGULAR, 7), fill=(0, 242, 255, 220))
    return image.convert("RGB")


if __name__ == "__main__":
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = square_logo()
    logo.save(ICONS / "icon.png", optimize=True)
    logo.save(ICONS / "icon-512.png", optimize=True)
    for size in (32, 64, 128, 256):
        logo.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"{size}x{size}.png", optimize=True)
    logo.save(ICONS / "icon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    sidebar_image().save(ROOT / "sidebar.bmp")
    header_image().save(ROOT / "header.bmp")
    print("Created ENOSX AI installer assets")
