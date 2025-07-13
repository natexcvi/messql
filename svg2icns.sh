#!/bin/bash

# Exit on error
set -e

# Input SVG and output ICNS
SVG="logo.svg"
ICONSET="logo.iconset"
ICNS="logo.icns"

# PNG sizes required for macOS icons
SIZES=(16 32 64 128 256 512 1024)

# Create iconset directory
mkdir -p "$ICONSET"

# Generate PNGs for each size
for SIZE in "${SIZES[@]}"; do
  magick "$SVG" -resize ${SIZE}x${SIZE} "$ICONSET/icon_${SIZE}x${SIZE}.png"
  # For @2x (retina) sizes, except for 1024
  if [ "$SIZE" -ne 1024 ]; then
    DOUBLE_SIZE=$((SIZE * 2))
    magick "$SVG" -resize ${DOUBLE_SIZE}x${DOUBLE_SIZE} "$ICONSET/icon_${SIZE}x${SIZE}@2x.png"
  fi
done

# Convert iconset to icns
iconutil -c icns "$ICONSET" -o "$ICNS"

# Cleanup
rm -rf "$ICONSET"

echo "Created $ICNS from $SVG"
