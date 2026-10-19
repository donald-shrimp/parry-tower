"""Deterministic, non-generative PNG candidates. Originals are read only.

Run with Python + Pillow and Node: python scripts/build-pixel-art.py
The full-size coordinate system is retained for existing cutout masks/joints.
"""
import hashlib
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/character-art/pixel-candidates"
PROFILES = {
    "fine": {"label": "細かめ", "block": 6, "colors": 64},
    "balanced": {"label": "標準", "block": 10, "colors": 40},
    "retro": {"label": "レトロ強め", "block": 14, "colors": 24},
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixels(image):
    return image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()


def low_resolution(source, block):
    """Integer grid with padding, avoiding uneven nearest-neighbour blocks."""
    rgba = source.convert("RGBA")
    padded = Image.new("RGBA", (math.ceil(rgba.width / block) * block,
                                math.ceil(rgba.height / block) * block))
    padded.paste(rgba, (0, 0))
    small = padded.resize((padded.width // block, padded.height // block), Image.Resampling.BOX)
    rgb = small.convert("RGB").filter(ImageFilter.UnsharpMask(radius=.7, percent=90, threshold=4))
    return small, rgb


def shared_palette(items, colors):
    # Ready/contact drawings share a palette; transparent RGB never biases it.
    visible = [rgb for small, image in items
               for rgba, rgb in zip(pixels(small), pixels(image)) if rgba[3] >= 80]
    if not visible:
        raise ValueError("Source contains no visible pixels")
    width = min(256, len(visible))
    count = width * math.ceil(len(visible) / width)
    train = Image.new("RGB", (width, count // width))
    train.putdata(visible + [visible[-1]] * (count - len(visible)))
    return train.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def convert(source, block, palette):
    small, rgb = low_resolution(source, block)
    reduced = rgb.quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    rgba_pixels = [(r, g, b, 255) if a[3] >= 80 else (0, 0, 0, 0)
                   for (r, g, b, _), a in zip(pixels(reduced), pixels(small))]
    reduced.putdata(rgba_pixels)
    output = reduced.resize((small.width * block, small.height * block), Image.Resampling.NEAREST)
    return output.crop((0, 0, source.width, source.height)), reduced


def sources():
    code = """
    const hero=require('./assets/character-hero-puppet'), knight=require('./assets/character-knight-puppet'), data=require('./assets/character-enemy-data');
    const out=[{id:'hero',role:'ready',label:'主人公・構え',source:hero.SOURCE},
      {id:'knight',role:'ready',label:'錆びた騎士・構え',source:knight.SOURCE},
      {id:'knight',role:'plume',label:'錆びた騎士・補修した赤い布',source:knight.PLUME.source}];
    for(const [id,s]of Object.entries(data)){
      out.push({id,role:'ready',label:s.name+'・構え',source:s.source});
      if(s.keyPose)out.push({id,role:'contact',label:s.name+'・振り下ろし/打ち込み',source:s.keyPose.source});
    }process.stdout.write(JSON.stringify(out));
    """
    return json.loads(subprocess.check_output(["node", "-e", code], cwd=ROOT, text=True, encoding="utf-8"))


def main():
    entries = sources()
    originals = {}
    for entry in entries:
        path = ROOT / "assets" / entry["source"]
        if not path.resolve().is_relative_to((ROOT / "assets/character-art/rework").resolve()):
            raise ValueError("Input must be an existing rework PNG")
        with Image.open(path) as image:
            entry.update(width=image.width, height=image.height, sha256=sha(path), variants={})
            originals[entry["source"]] = image.convert("RGBA")
    for style, settings in PROFILES.items():
        for identity in sorted({e["id"] for e in entries}):
            group = [e for e in entries if e["id"] == identity]
            palette = shared_palette([low_resolution(originals[e["source"]], settings["block"]) for e in group], settings["colors"])
            for entry in group:
                source = originals[entry["source"]]
                output, small = convert(source, settings["block"], palette)
                rel = Path(entry["source"]).relative_to("character-art/rework")
                target = DEST / style / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                output.save(target, optimize=True)
                entry["variants"][style] = {"source": target.relative_to(ROOT / "assets").as_posix(),
                    "sha256": sha(target), "grid": list(small.size),
                    "visibleColors": len({p[:3] for p in pixels(small) if p[3]}), "bytes": target.stat().st_size}
        print(f"{style}: {len(entries)} PNGs, {settings['block']}px blocks, {settings['colors']} shared colors")
    for entry in entries:
        if sha(ROOT / "assets" / entry["source"]) != entry["sha256"]:
            raise ValueError("Original changed during processing")
    manifest = {"version": 1, "status": "fine-adopted", "adoptedStyle": "fine", "method": "box-downsample, shared median-cut palette, binary alpha, nearest-neighbour upscale",
                "profiles": PROFILES, "files": entries}
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(entries)} unchanged originals; wrote manifest.json")


if __name__ == "__main__":
    main()
