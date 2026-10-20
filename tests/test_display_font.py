"""Check the actual font cmap; CSS font-family alone cannot detect fallback."""
import importlib.util
from pathlib import Path
import unittest

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('display_font', ROOT / 'scripts/build-display-font.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class DisplayFontTests(unittest.TestCase):
    def test_ui_characters_are_present_in_the_actual_font(self):
        with TTFont(builder.FONT_PATH) as font:
            cmap = font.getBestCmap()
        missing = sorted(c for c in builder.required_characters() if ord(c) not in cmap)
        self.assertEqual(missing, [], 'Rebuild with scripts/build-display-font.py: ' + ''.join(missing))

    def test_previous_missing_menu_and_canvas_text_is_covered(self):
        with TTFont(builder.FONT_PATH) as font:
            cmap = font.getBestCmap()
            self.assertIn('CP period', font['name'].getDebugName(1))
            self.assertTrue(any(record.nameID == 0 for record in font['name'].names))
        for text in ['ショップ', '第二楽章', '時空加速 ＋12', '時空減速 −12',
                     '時空安定 ±0', '立ち絵を読み込み中…', '静謐!', '魂の獲得']:
            with self.subTest(text=text):
                self.assertTrue(all(ord(c) in cmap for c in text))


if __name__ == '__main__':
    unittest.main()
