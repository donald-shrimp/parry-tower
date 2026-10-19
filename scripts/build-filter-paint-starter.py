"""Prepare editable assignment masks, not flattened recoloured images."""
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('palette_builder', ROOT / 'scripts/build-palette-art.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def runs(mask):
    flat = mask.ravel()
    boundaries = np.flatnonzero(np.r_[True, flat[1:] != flat[:-1], True])
    return [v for a, b in zip(boundaries[:-1], boundaries[1:]) for v in (int(b-a), int(flat[a]))]


def main():
    settings = [('metal', '鎧', 0, 15, 55, 110), ('cloth', '布', -130, 100, 80, 100),
                ('trim', '金の装飾', 0, 110, 105, 100), ('blade', '刃', 0, 5, 125, 95)]
    filters = [dict(id=i+1, name=name, hue=hue, saturation=sat, brightness=bright,
                    contrast=contrast, opacity=100, preserveInk=True, enabled=True)
               for i, (_, name, hue, sat, bright, contrast) in enumerate(settings)]
    manifest = json.loads((ROOT / 'assets/character-art/palette-candidates/manifest.json').read_text(encoding='utf-8'))
    king = next(c for c in manifest['characters'] if c['id'] == 'endking')
    images = []
    for f in king['files']:
        with Image.open(ROOT / 'assets' / f['source']) as source:
            rgba = np.asarray(source.convert('RGBA'))
            labels = builder.material_map(rgba, 'guardian', f['role'], 'endking')
            mask = np.zeros(labels.shape, dtype=np.uint8)
            for i, (name, *_) in enumerate(settings):
                mask[(labels == name) & (rgba[..., 3] > 0)] = i + 1
            images.append(dict(id=f['role'], name='終刻の王・'+('構え' if f['role'] == 'ready' else '振り下ろし'),
                               asset=f['source'], width=source.width, height=source.height, mask=runs(mask)))
    target = ROOT / 'assets/character-art/palette-candidates/endking-paint-starter.json'
    approved = ROOT / 'assets/character-art/approved/endking/project.json'
    if approved.exists():
        painting = json.loads(approved.read_text(encoding='utf-8'))
        filters = painting['filters']
        for image in images:
            image['mask'] = next(i['mask'] for i in painting['images'] if i['id'] == image['id'])
    target.write_text(json.dumps(dict(kind='parry-filter-paint', version=1, filters=filters, images=images,
                                     activeImage='ready', selectedFilter=2), ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print('Wrote editable king masks for two poses; all effects remain adjustable filters')


if __name__ == '__main__':
    main()
