# The purpose of this script is to start the backend (Flask on port 5001) and the frontend (Vite in
# dev:prod mode on port 5173) together with one command, and to stop both of them together. If either one
# exits, or the user presses Ctrl+C, the other is stopped too, so no server is left running in the background.
# Run it from anywhere with the project's venv active: python scripts/dev.py
#
# Abdon Morales, abdonmorales@utexas.edu
# November 7, 2026

import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
processes = []

# This method is the signal handler for Ctrl+C (SIGINT) and kill (SIGTERM). It turns both into a
# KeyboardInterrupt, so main() always reaches its cleanup code instead of exiting with the servers still running.
def interrupt_handler(sigNum, frame):
    raise KeyboardInterrupt

# This method sends a signal to a service's whole process group, not just the process this script started.
# npm starts Vite as a child process and Flask's debug reloader starts a second Python process, so signalling
# only the parent would leave those running. A group that has already exited is ignored.
def signal_group(proc, sig):
    try:
        os.killpg(proc.pid, sig)
    except ProcessLookupError:
        pass

# This the main method of the script, which starts each service in its own process group, then checks
# every 0.25 s whether either has exited. It stops both when one exits or on Ctrl+C: SIGTERM first, up to
# 5 seconds to shut down cleanly, then SIGKILL. It returns the exit code: the service's own code, 128 + the
# signal number if a service was killed by a signal, 130 for Ctrl+C, or 1 if a service could not be started.
def main():
    signal.signal(signal.SIGINT, interrupt_handler)
    signal.signal(signal.SIGTERM, interrupt_handler)
    services = [("backend", [sys.executable, "-m", "flask", "--app", "backend.app", "run", "--debug", "--port", "5001",], ROOT), 
                ("Frontend", ["npm", "run", "dev:prod", "--", "--port", "5173", "--strictPort",], ROOT / "haas-app",),
                ]

    try:
        for name, command, currDir in services:
            proc = subprocess.Popen(command, cwd=currDir, start_new_session=True)
            processes.append((name, proc))
            print(f"Starting {name}...", flush=True)

        while True:
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None:
                    print(f"{name} exited with status code {ret}.")
                    return ret if ret >= 0 else 128-ret
            time.sleep(0.25)

    except KeyboardInterrupt:
        print("Stopping both services...")
        return 130
    except OSError as err:
        print(f"Could not start services: {err}", file=sys.stderr)
        return 1
    finally:
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        for _, proc in processes:
            signal_group(proc, signal.SIGTERM)

        deadline = time.monotonic() + 5
        for _, proc in processes:
            try:
                proc.wait(timeout=max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                pass

        for _, proc in processes:
            signal_group(proc, signal.SIGKILL)
            proc.wait()

if __name__ == "__main__":
    sys.exit(main())