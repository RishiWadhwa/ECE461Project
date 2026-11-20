#!/bin/sh
# Start the Flask API (http://127.0.0.1:5001) from the project folder.
#
# From the project folder, in Terminal (macOS or Linux) or Git Bash / WSL (Windows):
#   sh scripts/flask.sh
#
# Pass --debug to reload when the backend changes.
# The script creates the virtualenv, installs the backend packages, and
# copies .env.example to .env when .env is missing.

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

if [ "${1:-}" = "--debug" ]; then
  export FLASK_DEBUG=1
  shift
fi

if [ "$#" -ne 0 ]; then
  echo "Usage: scripts/flask.sh [--debug]" >&2
  exit 1
fi

# True when the interpreter exists and is Python 3.10 or newer.
py_ok() {
  "$1" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1
}

BOOT=""
for cand in python3.12 python3.13 python3.14 python3.11 python3.10 python3 python; do
  if command -v "$cand" >/dev/null 2>&1 && py_ok "$cand"; then
    BOOT=$cand
    break
  fi
done

if [ -z "$BOOT" ]; then
  echo "Python 3.10 or newer is required." >&2
  echo "On the lab machines the default python3 is 3.6. Install Python 3.12 and run this again." >&2
  exit 1
fi

OS=$(uname -s)
case "$OS" in
  MINGW*|MSYS*|CYGWIN*)
    VENV_PY="$ROOT/.venv/Scripts/python.exe"
    ;;
  *)
    VENV_PY="$ROOT/.venv/bin/python"
    ;;
esac

if [ -f "$VENV_PY" ] && ! py_ok "$VENV_PY"; then
  echo "Replacing .venv because its Python is older than 3.10."
  rm -rf .venv
fi

if [ ! -f "$VENV_PY" ]; then
  echo "Creating a virtualenv with $BOOT..."
  "$BOOT" -m venv .venv
fi

echo "Installing backend packages..."
"$VENV_PY" -m pip install --upgrade pip
"$VENV_PY" -m pip install --upgrade -r backend/requirements.txt

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    echo "Missing .env and .env.example. The API needs MONGO_URI to start." >&2
    exit 1
  fi
  cp .env.example .env
  echo "Created .env from .env.example."
fi

echo "API:  http://127.0.0.1:5001"
echo "Site: https://hwaas.netlify.app"
echo "Leave this window open. Ctrl+C stops the server."

exec "$VENV_PY" -m backend.app
