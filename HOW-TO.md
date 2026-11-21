# How to run HaaS

The site is up. Open it in a browser; there is nothing to install:

- [https://hwaas.netlify.app](https://hwaas.netlify.app) (main link)
- [https://hwaas-31b6.onrender.com](https://hwaas-31b6.onrender.com) (the same app, served by Render)

Both use the same API and database, so an account made on one works on the other.

## Where it runs

The API is hosted on Render's free tier at `https://hwaas-31b6.onrender.com`. It runs the project's Docker image (the `Dockerfile` in the repo root), which serves both the built page and the API from that one URL. The data lives in MongoDB Atlas. The Netlify site is built to call the Render API directly.

[https://hwaas-31b6.onrender.com/health](https://hwaas-31b6.onrender.com/health) returns `{"status":"ok"}` when the server and its database connection are up.

## The first load can be slow

Render's free tier puts the server to sleep after about 15 minutes with no traffic. The next visit wakes it, which takes 30 to 60 seconds. While it wakes, the page shows a red banner, "Cannot reach the server. Retrying every 5s", and recovers on its own once the server answers. You do not need to refresh.

A scheduled GitHub Actions job pings `/health` every 10 minutes to keep the server awake, but GitHub sometimes delays scheduled runs, so a slow first load can still happen. Before a demo or grading session, open [https://hwaas-31b6.onrender.com/health](https://hwaas-31b6.onrender.com/health) a minute ahead of time.

## Use the site

When you create an account or a project, use:

- User ID: 5–16 letters or digits
- Password: 8–64 characters
- Project ID: `PROJ` plus digits, at least 8 characters total, for example `PROJ1001`

The header shows your user ID once you are signed in. Sign out with the button in the header. Sign in again with the same user ID and password to see the same projects and hardware counts.

## Run it on your own computer (optional)

You only need this for development, or if the hosted site is down. The hosted Netlify page does not talk to a local API, so when you run the API locally you also run the frontend locally.

Local runs read the database settings from a `.env` file in the project folder (`MONGO_URI`, and optionally `MONGO_DB`). Ask a teammate for the connection string. Do not commit `.env`.

### Start the API

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

The first run downloads packages, so it takes a minute. Later runs only refresh anything that changed. Add `--debug` to reload the server when backend code changes.

Leave that window open. Ctrl+C stops the server.

You need Python 3.10 or newer on your PATH. On the lab machines the default `python3` is 3.6, which is too old; install Python 3.12 and run the script again.

### Start the frontend

You need Node 22.12 or newer. In a second terminal:

```sh
cd haas-app
npm ci              # first time only
npm run dev:prod    # uses the API at http://127.0.0.1:5001
```

Then open [http://localhost:5173](http://localhost:5173).

`npm run dev` instead runs the frontend alone against an in-memory mock API. It needs no backend or database, and nothing it stores survives a restart.

### Start both at once

Once `flask.sh` has created `.venv` and you have run `npm ci` in `haas-app`, activate the virtualenv (`source .venv/bin/activate`) and run this from the project folder:

```sh
python scripts/dev.py
```

It starts the API on port 5001 and the frontend on port 5173, and Ctrl+C stops both.

### Docker

```sh
docker compose up --build       # then open http://localhost:8000
docker compose down --volumes   # stop and delete everything
```

This runs the whole app with its own throwaway MongoDB, not Atlas, so it does not need `.env` and does not touch the real data.
