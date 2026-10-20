"""The new skin retains the accepted source grid without touching old art."""
import importlib.util
import unittest
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pixel_builder', ROOT / 'scripts/build-pixel-art.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class HeroSkinArtTests(unittest.TestCase):
    def test_hand_revision_changes_only_the_grip_and_preserves_the_grid_and_palette(self):
        folder = ROOT / 'assets/character-art/skins/fundoshi'
        before = Image.open(folder / 'hero-fundoshi-fine-v1.png').convert('RGBA')
        after = Image.open(folder / 'hero-fundoshi-fine-v2.png').convert('RGBA')
        self.assertEqual(before.size, after.size)
        diff = ImageChops.difference(before, after)
        box = diff.convert('RGB').getbbox()
        self.assertIsNotNone(box)
        self.assertGreaterEqual(box[0], 606)
        self.assertGreaterEqual(box[1], 246)
        self.assertLessEqual(box[2], 714)
        self.assertLessEqual(box[3], 354)
        self.assertLessEqual(len({p[:3] for p in builder.pixels(after) if p[3]}), 64)
        source = Image.open(folder / 'hero-fundoshi-v1.png').convert('RGBA')
        edit = Image.open(folder / 'hero-fundoshi-hand-edit-v2.png').convert('RGBA')
        palette = builder.shared_palette([builder.low_resolution(source, 6)], 64)
        corrected, _ = builder.convert(edit, 6, palette)
        region = (606, 246, 714, 354)
        before.paste(corrected.crop(region), region)
        self.assertEqual(before.tobytes(), after.tobytes())

    def test_fundoshi_is_registered_transparent_and_reproducible(self):
        folder = ROOT / 'assets/character-art/skins/fundoshi'
        with Image.open(folder / 'hero-fundoshi-v1.png') as original:
            source = original.convert('RGBA')
        with Image.open(folder / 'hero-fundoshi-fine-v1.png') as original:
            adopted = original.convert('RGBA')
        self.assertEqual(source.size, (1445, 1088))
        self.assertEqual(adopted.size, source.size)
        self.assertEqual(set(i for i, n in enumerate(adopted.getchannel('A').histogram()) if n), {0, 255})
        colors = {p[:3] for p in builder.pixels(adopted) if p[3]}
        self.assertLessEqual(len(colors), 64)
        self.assertGreater(len(colors), 40)
        palette = builder.shared_palette([builder.low_resolution(source, 6)], 64)
        result, _ = builder.convert(source, 6, palette)
        self.assertEqual(result.tobytes(), adopted.tobytes())
        for point in [(212, 80), (650, 300), (770, 450), (900, 700), (500, 1010), (1160, 1010)]:
            self.assertGreater(source.getpixel(point)[3], 0, str(point))

if __name__ == '__main__':
    unittest.main()
