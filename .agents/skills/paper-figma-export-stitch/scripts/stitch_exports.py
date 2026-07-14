#!/usr/bin/env python3
"""
Horizontal PNG strip: desktop, mobile, promo — top-aligned, transparent canvas, fixed gap.

Requires: Pillow (`pip install pillow`).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Stitch PNGs left-to-right with transparent background and horizontal gap."
    )
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="Output PNG path",
    )
    parser.add_argument(
        "--gap",
        type=int,
        default=100,
        help="Horizontal spacing between images in pixels (default: 100)",
    )
    parser.add_argument(
        "images",
        nargs=3,
        metavar=("DESKTOP", "MOBILE", "PROMO"),
        type=Path,
        help="Three input PNG paths in order: desktop, mobile, promo",
    )
    args = parser.parse_args()

    try:
        from PIL import Image
    except ImportError:
        print(
            "Missing dependency: install Pillow (e.g. pip install pillow)",
            file=sys.stderr,
        )
        return 1

    paths = args.images
    for p in paths:
        if not p.is_file():
            print(f"Not a file: {p}", file=sys.stderr)
            return 1

    rgba_images = []
    for p in paths:
        im = Image.open(p)
        rgba_images.append(im.convert("RGBA"))

    gap = max(0, args.gap)
    total_w = sum(im.width for im in rgba_images) + gap * (len(rgba_images) - 1)
    max_h = max(im.height for im in rgba_images)
    canvas = Image.new("RGBA", (total_w, max_h), (0, 0, 0, 0))

    x = 0
    for im in rgba_images:
        canvas.paste(im, (x, 0), im)
        x += im.width + gap

    args.out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.out, format="PNG")
    print(args.out.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
