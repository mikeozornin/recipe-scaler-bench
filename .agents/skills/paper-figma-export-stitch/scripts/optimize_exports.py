#!/usr/bin/env python3
"""
Batch-optimize PNG exports in tmp/download/ (or a given directory).

Uses pngquant when available, else Pillow palette quantization.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from optimize_png import DEFAULT_QUALITY, format_size, optimize_png  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Optimize PNG workshop exports in place (pngquant or Pillow)."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="PNG files or directories (default: tmp/download/*.png in repo root)",
    )
    parser.add_argument(
        "--quality",
        default=DEFAULT_QUALITY,
        help=f"pngquant quality range, lossy up to 90 (default: {DEFAULT_QUALITY})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List files that would be optimized without writing",
    )
    args = parser.parse_args()

    repo_root = SCRIPT_DIR.parents[3]
    default_dir = repo_root / "tmp" / "download"

    targets: list[Path] = []
    if not args.paths:
        if default_dir.is_dir():
            targets = sorted(default_dir.glob("*.png"))
        else:
            print(f"No paths given and {default_dir} does not exist", file=sys.stderr)
            return 1
    else:
        for p in args.paths:
            if p.is_dir():
                targets.extend(sorted(p.glob("*.png")))
            elif p.is_file() and p.suffix.lower() == ".png":
                targets.append(p)
            else:
                print(f"Skip (not a PNG file or directory): {p}", file=sys.stderr)

    if not targets:
        print("No PNG files to optimize", file=sys.stderr)
        return 1

    if args.dry_run:
        for t in targets:
            print(t)
        return 0

    total_before = 0
    total_after = 0
    for path in targets:
        try:
            before, after, method = optimize_png(path, args.quality)
        except Exception as exc:
            print(f"FAIL {path.name}: {exc}", file=sys.stderr)
            continue
        total_before += before
        total_after += after
        if before == after:
            print(f"{path.name}: unchanged ({method})")
        else:
            pct = 100 - round(after / before * 100) if before else 0
            print(
                f"{path.name}: {format_size(before)} → {format_size(after)} "
                f"({pct}% smaller, {method})"
            )

    if len(targets) > 1 and total_before:
        pct = 100 - round(total_after / total_before * 100)
        print(
            f"total: {format_size(total_before)} → {format_size(total_after)} "
            f"({pct}% smaller)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
