from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
ICONS = ROOT.parent / "icons"
SOURCE = ROOT / "enosx-logo-source.png"


def fitted_logo(size, margin=0.08):
    source = Image.open(SOURCE).convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        source = source.crop(bbox)
    available = int(size * (1 - margin * 2))
    scale = min(available / source.width, available / source.height)
    logo = source.resize((max(1, int(source.width * scale)), max(1, int(source.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def sidebar_image():
    canvas = Image.new("RGBA", (164, 314), (5, 5, 5, 255))
    canvas.alpha_composite(fitted_logo(140, 0.05), (12, 32))
    return canvas.convert("RGB")


def header_image():
    canvas = Image.new("RGBA", (150, 57), (5, 5, 5, 255))
    canvas.alpha_composite(fitted_logo(48, 0.04), (8, 4))
    return canvas.convert("RGB")


if __name__ == "__main__":
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = fitted_logo(1024, 0.03)
    logo.save(ICONS / "icon.png", optimize=True)
    logo.save(ICONS / "icon-512.png", optimize=True)
    for size in (32, 64, 128, 256):
        logo.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"{size}x{size}.png", optimize=True)
    logo.save(ICONS / "icon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    sidebar_image().save(ROOT / "sidebar.bmp")
    header_image().save(ROOT / "header.bmp")
    print("Created installer assets from enosx-logo-source.png")
