#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# bump type: patch (default), minor, or major
BUMP="${1:-patch}"

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: ./release.sh [patch|minor|major]"
  exit 1
fi

# ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree dirty. Commit or stash changes first."
  exit 1
fi

# bump version in package.json
npm version "$BUMP" --no-git-tag-version
VERSION="$(node -p "require('./package.json').version")"

git add package.json
git commit -m "$VERSION"
git tag "v$VERSION"
git push origin main --tags

echo ""
echo "Released v$VERSION — GitHub Actions will publish to npm."
echo ""
