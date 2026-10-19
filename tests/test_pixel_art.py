"""Run separately with Python/Pillow: python -m unittest discover -s tests -p test_pixel_art.py"""
import importlib.util
import json
import unittest
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pixel_builder", ROOT / "scripts/build-pixel-art.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PixelArtTests(unittest.TestCase):
    def test_processing_is_deterministic_and_does_not_mutate_source(self):
        source = Image.new("RGBA", (31, 23), (250, 0, 250, 0))
        for x in range(7, 26):
            for y in range(3, 20):
                source.putpixel((x, y), (x * 7, y * 9, 60, 255))
        before = source.tobytes()
        palette = builder.shared_palette([builder.low_resolution(source, 4)], 8)
        a, _ = builder.convert(source, 4, palette)
        b, _ = builder.convert(source, 4, palette)
        self.assertEqual(a.tobytes(), b.tobytes())
        self.assertEqual(source.tobytes(), before)
        self.assertEqual(a.size, source.size)
        self.assertEqual(set(builder.pixels(a.getchannel("A"))), {0, 255})
        self.assertTrue(all(p == (0, 0, 0, 0) for p in builder.pixels(a) if p[3] == 0))

    def test_every_candidate_has_binary_alpha_uniform_blocks_and_shared_palette(self):
        data = json.loads((ROOT / "assets/character-art/pixel-candidates/manifest.json").read_text(encoding="utf-8"))
        shared = {}
        for entry in data["files"]:
            for style, variant in entry["variants"].items():
                block = data["profiles"][style]["block"]
                with Image.open(ROOT / "assets" / variant["source"]) as im:
                    rgba = im.convert("RGBA")
                    self.assertEqual(rgba.size, (entry["width"], entry["height"]))
                    self.assertEqual(set(i for i, n in enumerate(rgba.getchannel("A").histogram()) if n), {0, 255})
                    # Sampling each integer block and rebuilding must be exact.
                    small = Image.new("RGBA", tuple(variant["grid"]))
                    small.putdata([rgba.getpixel((x, y)) for y in range(0, rgba.height, block) for x in range(0, rgba.width, block)])
                    rebuilt = small.resize((small.width * block, small.height * block), Image.Resampling.NEAREST).crop((0, 0, rgba.width, rgba.height))
                    self.assertTrue(all(channel.getbbox() is None for channel in ImageChops.difference(rgba, rebuilt).split()))
                    visible = {p[:3] for p in builder.pixels(small) if p[3]}
                    self.assertEqual(len(visible), variant["visibleColors"])
                    shared.setdefault((entry["id"], style), set()).update(visible)
        for (_, style), colors in shared.items():
            self.assertLessEqual(len(colors), data["profiles"][style]["colors"])


if __name__ == "__main__":
    unittest.main()
