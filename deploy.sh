#!/usr/bin/env bash
#
# Build and restart the site on cPanel / DirectAdmin hosting (CloudLinux).
#
#   ssh in, cd to the app root (the folder holding this file), then:
#     ./deploy.sh              install dependencies, build, restart
#     ./deploy.sh --skip-install   build and restart only
#
# CloudLinux caps each account on processes and memory (LVE limits). A default
# `next build` starts one worker per CPU core the server reports, which runs
# into that cap and is killed with no useful error. Everything below keeps the
# build to one process at a time and a fixed heap.
#
# Before the first run:
#   1. Create the app under "Setup Node.js App" (Node 20+), with this folder as
#      the application root and server.js as the startup file.
#   2. Create .env.local here (see .env.example) with the production values.
#      NEXT_PUBLIC_* values are baked in at build time, so rebuild after changing them.
#
set -euo pipefail

cd "$(dirname "$0")"

SKIP_INSTALL=0
[ "${1:-}" = "--skip-install" ] && SKIP_INSTALL=1

# cPanel keeps each app's Node in ~/nodevenv/<app root>/<version>/. Use it when
# node is not already on PATH (NODE_VENV overrides the guess).
if ! command -v node >/dev/null 2>&1; then
  ACTIVATE="${NODE_VENV:-$(ls -d "$HOME"/nodevenv/*/*/bin/activate 2>/dev/null | head -n 1 || true)}"
  if [ -n "$ACTIVATE" ] && [ -f "$ACTIVATE" ]; then
    # shellcheck disable=SC1090
    source "$ACTIVATE"
  else
    echo "node not found. Set NODE_VENV=/home/<user>/nodevenv/<app>/<version>/bin/activate" >&2
    exit 1
  fi
fi

if [ ! -f .env.local ]; then
  echo ".env.local is missing. Copy .env.example to .env.local and set the production values first." >&2
  exit 1
fi

echo "==> node $(node -v), npm $(npm -v)"

export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
# Read by next.config.ts: one build worker, no worker threads, lint skipped.
export BUILD_SINGLE_THREAD=1
# The heap the build may use, in MB. Keep it under the account's memory limit;
# lower it (768) if the build is killed, raise it if it runs out of heap.
export NODE_OPTIONS="--max-old-space-size=${BUILD_MEMORY_MB:-1024}"
# libuv's and SWC's own thread pools count against the process limit too.
export UV_THREADPOOL_SIZE=1
export RAYON_NUM_THREADS=1

if [ "$SKIP_INSTALL" -eq 0 ]; then
  echo "==> installing dependencies"
  # devDependencies (typescript, tailwind) are needed to build, so they are
  # installed even though NODE_ENV is production.
  npm ci --include=dev --no-audit --no-fund --maxsockets=2
fi

echo "==> building (single-threaded)"
rm -rf .next
npx next build

echo "==> restarting"
# Passenger restarts the app when this file's timestamp changes.
mkdir -p tmp
touch tmp/restart.txt

echo "==> done. Check the site, then: curl -I https://cladasafaribliss.com/"
