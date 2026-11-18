#!/bin/sh
# Start the Flask API (http://127.0.0.1:5001) from the repo root.
#
# macOS and Linux:  ./scripts/flask.sh
# Windows:          Git Bash, MSYS, or WSL — sh scripts/flask.sh
#                   Command Prompt cannot run a shell script.
#
# Pass --debug to reload when the backend changes.
# The interpreter is the project virtualenv, so this does not depend on PATH
# or on which python the shell would otherwise find.

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

OS=$(uname -s)
WIN_PY="$ROOT/.venv/Scripts/python.exe"
UNIX_PY="$ROOT/.venv/bin/python"

case "$OS" in
  MINGW*|MSYS*|CYGWIN*)
    PYTHON=$WIN_PY
    PIP=".venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt"
    ;;
  *)
    PYTHON=$UNIX_PY
    PIP=".venv/bin/python -m pip install -r backend/requirements-dev.txt"
    ;;
esac

if [ "${1:-}" = "--debug" ]; then
  export FLASK_DEBUG=1
  shift
fi

if [ "$#" -ne 0 ]; then
  echo "Usage: scripts/flask.sh [--debug]" >&2
  exit 1
fi

if [ ! -f "$PYTHON" ]; then
  echo "No virtualenv interpreter at $PYTHON" >&2
  echo "From the repo root:" >&2
  echo "  python3.12 -m venv .venv" >&2
  echo "  $PIP" >&2
  exit 1
fi

exec "$PYTHON" -m backend.app
