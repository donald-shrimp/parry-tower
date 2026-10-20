"""Build the display WOFF2 from the unmodified official CP period ZIP/TTF.

Install fonttools[woff], then pass cp_period_tte.zip or cp_period.ttf.
Collect all gameplay UI copy (a superset of the display-font selectors), plus
Latin, kana and full-width forms so routine menu edits do not lose characters.
Font names, copyright records, outlines and hinting remain intact.
"""
import argparse
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
TEXT_FILES = (
    'index.html', 'dev.html', 'credits.html', 'assets/game.js',
    'assets/encounters.js', 'assets/enemy-motions.js', 'assets/progression.js',
    'assets/relics.js', 'assets/routes.js', 'assets/events.js', 'assets/stage-music.js',
)
FONT_PATH = ROOT / 'assets/fonts/cp-period-display.woff2'


def ui_characters():
    return set(''.join((ROOT / name).read_text('utf-8') for name in TEXT_FILES))


def required_characters():
    # Emoji and symbols absent from the original font deliberately use fallback.
    return {c for c in ui_characters() if
            0x20 <= ord(c) <= 0x7e or 0x3000 <= ord(c) <= 0x30ff or
            0x3400 <= ord(c) <= 0x9fff or 0xff00 <= ord(c) <= 0xffef
            } | set('×＋−±…')


def build(source, output=FONT_PATH):
    if source.suffix.lower() == '.zip':
        with ZipFile(source) as archive:
            data = archive.read('cp_period_tte/cp_period.ttf')
    else:
        data = source.read_bytes()
    font = TTFont(BytesIO(data), recalcTimestamp=False)
    original_map = font.getBestCmap()
    missing = sorted(c for c in required_characters() if ord(c) not in original_map)
    if missing:
        raise ValueError('Required characters absent from original font: ' + ''.join(missing))
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.recalc_timestamp = False
    selected = subset.Subsetter(options=options)
    codepoints = set(range(0x20, 0x7f)) | set(range(0x3000, 0x3100)) | set(range(0xff00, 0xfff0))
    codepoints.update(map(ord, ui_characters()))
    selected.populate(unicodes=codepoints)
    selected.subset(font)
    font.flavor = 'woff2'
    font.save(output)
    print(f'{len(font.getBestCmap())} characters, {output.stat().st_size} bytes: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=FONT_PATH)
    args = parser.parse_args()
    build(args.source, args.output)
