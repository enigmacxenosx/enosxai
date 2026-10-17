from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
ICONS = ROOT.parent / "icons"
SOURCE = ROOT / "enosx-logo-source.png"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

NAVY = (4, 13, 35, 255)
NAVY_DARK = (2, 7, 20, 255)
CYAN = (20, 190, 255, 255)
MINT = (0, 219, 180, 255)
WHITE = (241, 248, 255, 255)
MUTED = (157, 181, 210, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


def fitted_logo(size, margin=0.08):
    source = Image.open(SOURCE).convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if bbox:
        source = source.crop(bbox)
    available = int(size * (1 - margin * 2))
    scale = min(available / source.width, available / source.height)
    logo = source.resize(
        (max(1, int(source.width * scale)), max(1, int(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def glow(size, center, radius, color, alpha=120):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    px = layer.load()
    cx, cy = center
    for y in range(size[1]):
        for x in range(size[0]):
            distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            strength = max(0.0, 1.0 - distance / radius) ** 2
            px[x, y] = (*color[:3], int(alpha * strength))
    return layer


def accent_lines(draw, width, height, step=14):
    for index, y in enumerate(range(step, height, step)):
        length = int(width * (0.22 + ((index * 17) % 41) / 100))
        x = width - length - 10
        color = (20, 190, 255, max(35, 125 - (index % 5) * 16))
        draw.line((x, y, width - 8, y), fill=color, width=1)


def icon_asset(size=1024):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(glow((size, size), (size // 2, size // 2), size * 0.7, CYAN, 100))
    canvas.alpha_composite(glow((size, size), (size * 0.33, size * 0.64), size * 0.46, MINT, 55))
    logo = fitted_logo(size, 0.04)
    canvas.alpha_composite(logo)
    return canvas


def sidebar_image():
    width, height = 164, 314
    image = Image.new("RGBA", (width, height), NAVY_DARK)
    image.alpha_composite(glow((width, height), (30, 92), 155, CYAN, 100))
    image.alpha_composite(glow((width, height), (140, 226), 145, MINT, 55))
    accent_lines(ImageDraw.Draw(image), width, height)
    image.alpha_composite(fitted_logo(130, 0.02), (17, 26))

    draw = ImageDraw.Draw(image)
    draw.rectangle((12, 168, width - 12, 169), fill=(20, 190, 255, 170))
    labels = [
        ("ENOSX AI", FONT_BOLD, 13, 184, WHITE),
        ("DESKTOP ASSISTANT", FONT_REGULAR, 8, 204, CYAN),
        ("from Enosx Technologies", FONT_REGULAR, 9, 228, MUTED),
    ]
    for text, face, size, y, color in labels:
        f = font(face, size)
        bbox = draw.textbbox((0, 0), text, font=f)
        draw.text(((width - (bbox[2] - bbox[0])) / 2, y), text, font=f, fill=color)
    draw.rectangle((0, height - 4, width, height), fill=MINT)
    return image.convert("RGB")


def header_image():
    width, height = 150, 57
    image = Image.new("RGBA", (width, height), NAVY_DARK)
    image.alpha_composite(glow((width, height), (23, 28), 72, CYAN, 100))
    image.alpha_composite(fitted_logo(50, 0.02), (5, 3))
    draw = ImageDraw.Draw(image)
    draw.text((58, 13), "ENOSX AI", font=font(FONT_BOLD, 13), fill=WHITE)
    draw.text((58, 31), "ENOSX TECHNOLOGIES", font=font(FONT_REGULAR, 7), fill=CYAN)
    draw.line((58, 45, 142, 45), fill=MINT, width=1)
    return image.convert("RGB")


if __name__ == "__main__":
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = icon_asset()
    logo.save(ICONS / "icon.png", optimize=True)
    logo.save(ICONS / "icon-512.png", optimize=True)
    for size in (32, 64, 128, 256):
        logo.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"{size}x{size}.png", optimize=True)
    logo.save(
        ICONS / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    sidebar_image().save(ROOT / "sidebar.bmp")
    header_image().save(ROOT / "header.bmp")
    print("Created ENOSX AI installer assets from enosx-logo-source.png")
