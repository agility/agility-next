#!/usr/bin/env bash
# Build this fixture against a packed @agility/nextjs and check the rendered HTML.
# usage: test/fixtures/next16/run.sh <next version> <react version> [path to .tgz]
# Run from anywhere; it works in a temporary copy so the repo stays clean.
set -euo pipefail
NEXT_VERSION="$1"
REACT_VERSION="$2"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
TGZ="${3:-}"
if [ -z "$TGZ" ]; then
	# Build first: the compiled output is gitignored and `npm pack --ignore-scripts` skips `prepare`.
	(cd "$ROOT" && npm run build >/dev/null)
	TGZ="$(cd "$ROOT" && npm pack --silent --ignore-scripts | tail -1)"
	TGZ="$ROOT/$TGZ"
fi
WORK="$(mktemp -d)"
PID=""
trap '[ -n "$PID" ] && kill $PID 2>/dev/null; rm -rf "$WORK"' EXIT
cp -R "$HERE/." "$WORK/"
cd "$WORK"
# React 18 runs the Pages Router only: Next's App Router needs React 19.
# Resolve the version first, so a range or dist-tag ("19", "latest") compares as a number.
REACT_MAJOR="$(npm view "react@$REACT_VERSION" version --json | node -e 'const v = JSON.parse(require("fs").readFileSync(0, "utf8")); console.log(String([].concat(v).at(-1)).split(".")[0])')"
if [ "$REACT_MAJOR" -lt 19 ]; then rm -rf app; fi
npm install --no-audit --no-fund --loglevel=error "next@$NEXT_VERSION" "react@$REACT_VERSION" "react-dom@$REACT_VERSION" "@agility/content-fetch@^2" "$TGZ"
echo "next $(node -p "require('next/package.json').version"), react $(node -p "require('react/package.json').version"), @agility/nextjs $(node -p "require('@agility/nextjs/package.json').version")"
NEXT_TELEMETRY_DISABLED=1 npx next build > build.log 2>&1 || { tail -40 build.log; exit 1; }
PORT=3999
NEXT_TELEMETRY_DISABLED=1 npx next start -p $PORT > start.log 2>&1 &
PID=$!
for i in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$PORT/legacy" && break; sleep 1; done
node verify.mjs "http://localhost:$PORT" "$(node -p "require('react/package.json').version")"
