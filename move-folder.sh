#!/bin/bash
set -e

SRC="/Users/mike/work/git-repos/projects/ai workshops/design with ai/tmp"
DST="/Users/mike/work/git-repos/projects/ai workshops/design with ai-tmp"

if [ ! -d "$SRC" ]; then
    echo "Source directory does not exist: $SRC"
    exit 1
fi

if [ -d "$DST" ]; then
    cp -Rn "$SRC"/* "$DST"/ 2>/dev/null || true
    find "$SRC" -mindepth 1 -maxdepth 1 -type d | while read dir; do
        basename="$(basename "$dir")"
        if [ -d "$DST/$basename" ]; then
            cp -Rn "$dir"/* "$DST/$basename"/ 2>/dev/null || true
        else
            cp -R "$dir" "$DST"/
        fi
    done
    rm -rf "$SRC"
else
    mv "$SRC" "$DST"
fi
