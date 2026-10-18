#!/usr/bin/env python3
"""Create two *static* color-region SVGs from an approved PNG.

Usage: python scripts/trace-character-png.py hero-source.png --out-dir out
Requirements: pip install opencv-python numpy
No game code or animation is touched.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from xml.etree import ElementTree as ET

import cv2
import numpy as np

PALETTE = [
    ("#ffffff", (255, 255, 255)),
    ("#ced0d8", (207, 208, 216)),
    ("#898f9d", (137, 143, 157)),
    ("#0061e4", (0, 97, 228)),
    ("#0052b7", (1, 82, 183)),
    ("#fac448", (250, 196, 72)),
    ("#815f4b", (129, 95, 75)),
    ("#263253", (38, 50, 83)),
    ("#02123a", (2, 18, 58)),
]

def make_masks(source: np.ndarray, size: int):
    source = cv2.resize(source, (size, size), interpolation=cv2.INTER_AREA)
    light = (source.min(2) > 230) & ((source.max(2) - source.min(2)) < 18)
    n, lab, _, _ = cv2.connectedComponentsWithStats(light.astype(np.uint8), 8)
    border = np.unique(np.r_[lab[:2, :].ravel(), lab[-2:, :].ravel(),
                              lab[:, :2].ravel(), lab[:, -2:].ravel()])
    border = border[border > 0]
    foreground = (~np.isin(lab, border)).astype(np.uint8)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE,
                                  np.ones((3, 3), np.uint8))
    n, components, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
    mask = np.zeros((size, size), np.uint8)
    for i in range(1, n):
        if stats[i, 4] > 20:
            mask[components == i] = 255

    targets = np.array([rgb for _, rgb in PALETTE], np.uint8).reshape(-1, 1, 3)
    target_lab = cv2.cvtColor(targets, cv2.COLOR_RGB2LAB).astype(np.int32)[:, 0]
    image_lab = cv2.cvtColor(source, cv2.COLOR_RGB2LAB).astype(np.int32)
    d = np.sum((image_lab[:, :, None] - target_lab[None, None]) ** 2, axis=-1)
    labels = d.argmin(2).astype(np.uint8)
    labels[(source.max(2) < 60) & (mask != 0)] = len(PALETTE) - 1
    labels[mask == 0] = 255
    return labels

def save_svg(labels: np.ndarray, target: Path, epsilon: float, min_area: float):
    size = labels.shape[0]
    root = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg",
                             "viewBox": f"0 0 {size} {size}",
                             "width": str(size), "height": str(size)})
    for i, (color, _) in enumerate(PALETTE):
        mask = (labels == i).astype(np.uint8) * 255
        if i != len(PALETTE) - 1:
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE,
                                    np.ones((2, 2), np.uint8))
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP,
                                                 cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None:
            continue
        hierarchy = hierarchy[0]
        pieces = []
        for k, outer in enumerate(contours):
            if hierarchy[k][3] != -1 or cv2.contourArea(outer) < min_area:
                continue
            segments = [outer]
            hole = hierarchy[k][2]
            while hole != -1:
                if cv2.contourArea(contours[hole]) >= min_area * 0.45:
                    segments.append(contours[hole])
                hole = hierarchy[hole][0]
            for points in segments:
                vertices = cv2.approxPolyDP(points, epsilon, True).reshape(-1, 2)
                if len(vertices) >= 3:
                    pieces.append("M" + " ".join(f"{x},{y}" for x, y in vertices) + "Z")
        if pieces:
            ET.SubElement(root, "path", {"fill": color, "fill-rule": "evenodd",
                                         "d": " ".join(pieces)})
    target.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(target, encoding="utf-8", xml_declaration=True)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path, help="approved full-resolution PNG")
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--size", type=int, default=628)
    args = p.parse_args()
    image = cv2.imread(str(args.source), cv2.IMREAD_COLOR)
    if image is None:
        p.error(f"cannot read: {args.source}")
    labels = make_masks(cv2.cvtColor(image, cv2.COLOR_BGR2RGB), args.size)
    save_svg(labels, args.out_dir / "hero-traced.svg", .55, 10)
    save_svg(labels, args.out_dir / "hero-static.svg", 1.75, 34)
    for name in ("hero-traced.svg", "hero-static.svg"):
        target = args.out_dir / name
        print(f"{target} ({target.stat().st_size} bytes)")
if __name__ == "__main__":
    main()
