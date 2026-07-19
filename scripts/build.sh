#!/bin/bash
set -e

echo "=== Building Evocode ==="

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run build
echo "Building..."
npm run build

# Package application
echo "Packaging..."
npm run package

echo "=== Build completed ==="
echo "Artifacts:"
ls -la dist/
