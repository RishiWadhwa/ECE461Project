# HaaS Frontend

The React + TypeScript client for the HaaS app. It covers signing in and registering, creating and joining projects, and checking HWSet1 and HWSet2 units in and out. Every user, project, and hardware value on the page comes from the API; nothing is hard-coded (R2-2).

Built with Vite, tested with vitest, linted with oxlint. Requires Node 22.12+ (see `.nvmrc`).

## Running it

Run everything from this folder (`haas-app/`), after a one-time `npm ci`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 with an **in-memory mock API**. No backend or database needed; data resets when the server restarts. |
| `npm run dev:prod` | Dev server against the **real Flask backend** at http://localhost:5001 (or `VITE_API_URL`). Start Flask first; writes go to whatever database Flask's `MONGO_DB` names. |
| `npm test` | Run the vitest suites once (`npm run test:watch` to keep them running). |
| `npm run lint` | oxlint. |
| `npm run build` | Typecheck (`tsc -b`) and production build into `dist/`. |

To start Flask and the frontend together, run `python scripts/dev.py` from the repo root. Ctrl+C stops both.

A production build sends requests to its own address, because the Docker image serves the page and the API from one place (`docker compose up --build` from the repo root, then http://localhost:8000).

## Layout

```
mock-api.ts, mock-db.ts   The mock backend: Vite middleware used only by `npm run dev`
src/
  api.ts                  The only code that talks to the server. ApiClient owns the routes and the
                          status-to-error mapping; HttpApiClient sends the requests; createApi() picks
                          the base URL from the Vite mode.
  validation.ts           Checks form input before it is sent, and returns branded types
                          (Quantity, ProjectID, ...) that api.ts requires, so unchecked input can't be sent.
  errors.ts               AppError and its subclasses: ValidationError, ApiError, NetworkError, NumberFormatError.
  math.ts                 Integer / Double / Float value classes, used to parse quantities.
  session.ts              Per-session request queue: requests for the same project and hardware set run
                          one at a time, in order, and are dropped on sign-out. Holds no totals.
  connection.ts           Server status (online / offline) and the retry loop behind ConnectionBanner.
  components/             SignInView, NewUserModal, ProjectsView, ResourcesView, HardwareSetCard, ConnectionBanner
  *.test.ts               Unit tests next to the code they cover
```

## Conventions

- Components never call `fetch`. They call `api`, and catch `AppError` subclasses to show messages.
- Validate input first with `validation.ts`; `api.ts` only accepts its branded types.
- The mock in `mock-api.ts` follows the same request and response formats as Flask (see `docs/api-roadmap.md`). If a route changes, update both.
