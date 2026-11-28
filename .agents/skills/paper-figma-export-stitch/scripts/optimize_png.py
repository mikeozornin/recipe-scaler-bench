#!/usr/bin/env python3
"""PNG optimization for workshop exports (pngquant, required)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


DEFAULT_QUALITY = "0-90"  # lossy pngquant: perceptual quality up to 90


def optimize_png(path: Path, quality: str = DEFAULT_QUALITY) -> tuple[int, int, str]:
    """Compress a PNG in place (lossy). Returns (before_bytes, after_bytes, method)."""
    before = path.stat().st_size
    tmp = path.with_name(path.stem + ".opt-tmp.png")

    pngquant = shutil.which("pngquant")
    if pngquant:
        result = subprocess.run(
            [
                pngquant,
                "--quality",
                quality,
                "--speed",
                "1",
                "--skip-if-larger",
                "--force",
                "--output",
                str(tmp),
                str(path),
            ],
            capture_output=True,
        )
        if result.returncode == 0 and tmp.is_file():
            after = tmp.stat().st_size
            if after < before:
                tmp.replace(path)
                return before, after, "pngquant"
        if tmp.exists():
            tmp.unlink()
        if result.returncode == 99:
            return before, before, "skipped"
    else:
        print(
            "pngquant not found — install it first: brew install pngquant",
            file=sys.stderr,
        )
        return before, before, "skipped: no pngquant"

    return before, before, "skipped"


def format_size(n: int) -> str:
    if n >= 1024 * 1024:
        return f"{n / (1024 * 1024):.2f} MB"
    return f"{n // 1024} KB"
