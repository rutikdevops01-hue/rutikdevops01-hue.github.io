#!/usr/bin/env bash
# Usage: bash personalize.sh <your-github-username>
# Replaces the YOUR_GITHUB_USERNAME placeholder everywhere (links, canonical URL, terminal, footer).
set -e
[ -z "$1" ] && { echo "Usage: bash personalize.sh <your-github-username>"; exit 1; }
grep -rl "YOUR_GITHUB_USERNAME" index.html src README.md 2>/dev/null | xargs sed -i "s/YOUR_GITHUB_USERNAME/$1/g"
echo "Done. Your repo must be named $1.github.io"
