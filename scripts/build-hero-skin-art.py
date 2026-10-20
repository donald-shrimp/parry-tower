"""Apply the adopted 6px / 64-colour process to the new skin only.

Does not rebuild or modify any accepted production artwork.
"""
import importlib.util
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pixel_builder', ROOT / 'scripts/build-pixel-art.py')
pixel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pixel)

def main():
    folder = ROOT / 'assets/character-art/skins/fundoshi'
    source = Image.open(folder / 'hero-fundoshi-v1.png').convert('RGBA')
    assert source.size == (1445, 1088), source.size
    palette = pixel.shared_palette([pixel.low_resolution(source, 6)], 64)
    result, _ = pixel.convert(source, 6, palette)
    target = folder / 'hero-fundoshi-fine-v1.png'
    result.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes')
    # Adopt only the generated hand correction; every other accepted pixel
    # remains byte-identical, including the shield and weapon geometry.
    hand = Image.open(folder / 'hero-fundoshi-hand-edit-v2.png').convert('RGBA')
    assert hand.size == source.size, hand.size
    corrected, _ = pixel.convert(hand, 6, palette)
    region = (606, 246, 714, 354)  # Whole 6px blocks around the gripping hand.
    result.paste(corrected.crop(region), region)
    target = folder / 'hero-fundoshi-fine-v2.png'
    result.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes')

if __name__ == '__main__':
    main()
