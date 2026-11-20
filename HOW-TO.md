# How to run HaaS

The site is already up: [https://hwaas.netlify.app](https://hwaas.netlify.app)

That page talks to an API on your computer at `http://127.0.0.1:5001`. Start the API, leave the terminal open, then use the site.

## Start the API

Open a terminal in the project folder and run:

```sh
sh scripts/flask.sh
```

The command is the same on macOS, Linux, and Windows.

- macOS: Terminal
- Linux: Terminal
- Windows: Git Bash or WSL

The script does the setup itself:

1. Finds Python 3.10 or newer (it prefers 3.12 when that is installed).
2. Creates `.venv` if it is missing.
3. Updates pip and installs the backend packages from `backend/requirements.txt`.
4. Copies `.env.example` to `.env` if you do not already have a `.env`.
5. Starts the API at [http://127.0.0.1:5001](http://127.0.0.1:5001).

The first run downloads packages, so it takes a minute. Later runs only refresh anything that changed.

Leave that window open. Ctrl+C stops the server.

You need Python 3.10 or newer on your PATH. On the lab machines the default `python3` is 3.6, which is too old; install Python 3.12 and run the script again.

## Use the site

Open [https://hwaas.netlify.app](https://hwaas.netlify.app) after the API is running. The header shows your user ID when the API is reachable.

When you create an account or a project, use:

- User ID: 5–16 letters or digits
- Password: 8–64 characters
- Project ID: `PROJ` plus digits, at least 8 characters total, for example `PROJ1001`

Sign out with the button in the header. Sign in again with the same user ID and password to see the same projects and hardware counts.
