import importlib.util
import json
import unittest
from pathlib import Path

from PIL import Image, ImageChops
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('palette_builder', ROOT / 'scripts/build-palette-art.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PaletteArtTests(unittest.TestCase):
    def test_king_original_resolution_uses_exact_approved_painting(self):
        m = json.loads((ROOT / 'assets/character-art/palette-candidates/manifest.json').read_text(encoding='utf-8'))
        king = next(c for c in m['characters'] if c['id'] == 'endking')
        for f in king['files']:
            with Image.open(ROOT / 'assets' / f['approvedSource']['source']) as accepted, Image.open(ROOT / 'assets' / f['variants']['original']['source']) as output:
                self.assertEqual(accepted.convert('RGBA').tobytes(), output.convert('RGBA').tobytes())

    def test_revised_cloth_follows_fabric_not_thigh_plates_in_both_king_poses(self):
        m = json.loads((ROOT / 'assets/character-art/palette-candidates/manifest.json').read_text(encoding='utf-8'))
        points = {
            ('orbital_clockwork', 'ready'): ([(1020, 620), (1100, 660), (1180, 790)], [(890, 640), (1215, 605), (1250, 665)]),
            ('endking', 'ready'): ([(545, 710), (1000, 700)], [(650, 670), (690, 755)]),
            ('endking', 'contact'): ([(850, 680), (1240, 680)], [(1015, 645), (1040, 760)]),
        }
        for (identity, role), (cloth, armour) in points.items():
            c = next(c for c in m['characters'] if c['id'] == identity)
            f = next(f for f in c['files'] if f['role'] == role)
            with Image.open(ROOT / 'assets' / f['source']) as source:
                rgba = np.asarray(source.convert('RGBA'))
                labels = builder.material_map(rgba, c['base'], role, identity)
                for x, y in cloth:
                    self.assertGreater(rgba[y, x, 3], 0)
                    self.assertEqual(labels[y, x], 'cloth', f'{identity}/{role} fabric {x},{y}')
                for x, y in armour:
                    self.assertGreater(rgba[y, x, 3], 0)
                    self.assertNotEqual(labels[y, x], 'cloth', f'{identity}/{role} plate {x},{y}')

    def test_material_regions_separate_identical_gold_and_preserve_ink_and_alpha(self):
        source = Image.new('RGBA', (1445, 1088), (199, 151, 62, 255))
        source.putpixel((10, 10), (12, 13, 15, 255))
        source.putpixel((11, 10), (255, 0, 0, 0))
        before = source.tobytes()
        a = builder.recolour(source, 'guardian', 'ready', 'endking')
        b = builder.recolour(source, 'guardian', 'ready', 'endking')
        self.assertEqual(a.tobytes(), b.tobytes())
        self.assertEqual(source.tobytes(), before)
        self.assertEqual(a.getchannel('A').tobytes(), source.getchannel('A').tobytes())
        self.assertEqual(a.getpixel((10, 10)), (12, 13, 15, 255))
        self.assertEqual(a.getpixel((11, 10)), (0, 0, 0, 0))
        armour, cloth, crown, blade = [a.getpixel(p)[:3] for p in [(600, 440), (1100, 700), (490, 350), (1200, 140)]]
        self.assertEqual(len({armour, cloth, crown, blade}), 4)
        self.assertGreater(crown[0], crown[2], 'gold crown')
        self.assertGreater(cloth[2], cloth[1], 'purple cloak')
        self.assertGreater(sum(blade), sum(armour), 'bright blade and dark armour')

    def test_all_outputs_preserve_alpha_and_share_pixel_palettes_across_poses(self):
        manifest = json.loads((ROOT / 'assets/character-art/palette-candidates/manifest.json').read_text(encoding='utf-8'))
        pixels = json.loads((ROOT / 'assets/character-art/pixel-candidates/manifest.json').read_text(encoding='utf-8'))
        for c in manifest['characters']:
            colors = {style: set() for style in pixels['profiles']}
            for f in c['files']:
                old = next(p for p in pixels['files'] if p['source'] == f['source'])
                for style, variant in f['variants'].items():
                    with Image.open(ROOT / 'assets' / variant['source']) as im, Image.open(ROOT / 'assets' / (f['source'] if style == 'original' else old['variants'][style]['source'])) as original:
                        self.assertEqual(im.size, original.size)
                        self.assertIsNone(ImageChops.difference(im.getchannel('A'), original.getchannel('A')).getbbox())
                        if style == 'original': continue
                        block = pixels['profiles'][style]['block']
                        small = Image.new('RGBA', tuple(old['variants'][style]['grid']))
                        small.putdata([im.getpixel((x, y)) for y in range(0, im.height, block) for x in range(0, im.width, block)])
                        rebuilt = small.resize((small.width * block, small.height * block), Image.Resampling.NEAREST).crop((0, 0, im.width, im.height))
                        self.assertTrue(all(ch.getbbox() is None for ch in ImageChops.difference(im, rebuilt).split()))
                        colors[style].update(p[:3] for p in builder.pixel.pixels(small) if p[3])
            for style, palette in colors.items():
                self.assertLessEqual(len(palette), pixels['profiles'][style]['colors'])


if __name__ == '__main__':
    unittest.main()
