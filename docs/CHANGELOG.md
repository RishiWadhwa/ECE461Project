# Changelog

Frontend changes to `haas-app/`, newest first. Converted from `docs/notes.txt`.

## 2026-10-12

### Changed
- **Projects page (`ProjectsView.tsx`)**: Access is now Join. The card, button, labels, and state are all renamed.
  - Joining a new project makes the user an authorized user and opens its Hardware page. After that, the project stays in their My Projects list.
  - If they're already a member, the server's 409 is caught and they go straight to that project's Hardware page.
  - Unknown or badly formatted IDs still show an error.
  - Directly below `join` there's a commented-out version that shows "You are already part of this project" instead. To use it, swap it in for `join`.

### Added
- **Hardware page (`ResourcesView.tsx`)**: a "Working Under" card at the top shows the project's name, description, and members (loaded with `getProjectInfo`). It reloads when the server comes back after an outage.

### Known gaps
- The Flask backend has no `/join_project` route yet, so Join only works with the mock API.

## 2026-10-10 — Final frontend sprint for the MVP

### Phase 1: `math.ts` finished, `Number()` calls removed
- `math.ts`: `Integer.valueOf` reads the digits itself instead of calling `Number(t)`. `Double` and `Float` work the same way. All three reject exponent notation (`1e0`), hex, `Infinity`, `NaN`, and trailing junk. `Float` also rounds to 32-bit precision and rejects values too big for a float.
  - `Double` and `Float` call `parseFloat`, but only after the strict format check passes, because `parseFloat` rounds decimals correctly. It can be dropped if the team prefers.
- `validation.ts`: removed the two `checkQuantity` checks that ran on an `Integer` object, since they rejected every quantity. A new `parseQuantity(text)` keeps both original messages: `"2.5"` gets "not a double!", and `"1e0"` and `"abc"` get "must be a whole number!". This is the only place `Double` is used.
- `HardwareSetCard.tsx`: the broken `IntMath` import is gone. The card calls `parseQuantity`, then `validateQuantity` with `Integer.of(available)`.
- `api.ts`: `checkOut` and `checkIn` take an `Integer`. It's still sent as a plain number in the request body.
- `mock-api.ts`: both `Number()` calls go through `Integer`. A quantity sent as the string `"5"` gets a 400, the same as `2.5`.
- Tests: new cases for `Double`, `Float`, and `parseQuantity`, plus one for the string `"5"` in the mock API. The `"1e0"` and `"2.5"` messages were also checked by hand in the running app.
- Decisions are recorded in `tasks/plan.md`, with T1–T3 checked off. The "review with team" box in Checkpoint A is still open.

### Phase 2: ResourcesView is its own page
- `App.tsx` has no tab bar or router. It picks the page from state:
  - no one signed in → Sign In
  - signed in, no project open → Projects
  - project open → Hardware
- The Hardware page (`ResourcesView`) has a "← Projects" button that closes the project. Sign Out on either page clears both the user and the project. The "pick a project first" message and the view-only cards were removed, since the page only appears once a project is open.
- Projects page (`ProjectsView`): only the Create Project and Access Project forms show, side by side in the existing pair-grid layout, stacking on narrow screens. Both go straight to the Hardware page. The My Projects list, Working Under card, list refresh, Join call, and the imports they need are commented out (not deleted), each with an `// MVP:` note.
- Change from the plan: Access Project skipped `validateProjectID` at this point, because the 8-character rule would have blocked seeded IDs like `demo1` and `edge42`. It only checked that the project existed (Decision 5). Phase 3 restored the check.
- Checked on the dev server: `get_project_info` returns `demo1` and gives a 404 "Project not found" for unknown IDs; check-out works; `/__mock/outage?seconds=abc` returns a 400 instead of crashing.

### Phase 3: request queue, future-feature stub, updated tests
- **Project ID rules on Access**
  - Seeded IDs now meet the 8-character, letters-and-digits rule: `demo1` → `demoproj1`, `rf-lab` → `rflabproj`, `edge42` → `edgeproj42`. Every test using the old IDs was updated (`mock-api.test.ts`, `api.test.ts`).
  - Access Project runs `validateProjectID` again. A too-short ID shows "Project ID must be at least 8 characters" and is never sent. A valid-looking ID that doesn't exist gets "Project not found" (404).
  - New tests: every seeded ID passes the rules, and `missingproj` passes the rules but gets a 404. The too-short case (`proj001`) was already covered in `validation.test.ts`.
- **T6: request queue (`session.ts`)**, a `Map` keyed by `projectID:hwSet`
  - Requests for the same hardware set run one at a time, in order.
  - If one fails, the ones after it still run.
  - A key is removed as soon as its requests finish.
  - Sign Out calls `clear()`. Waiting requests are cancelled rather than sent after the user has left, and nothing stays in memory. Requests already sent still finish.
  - Five new tests cover ordering, separate keys, failures, cleanup, and `clear()`.
- **T7: component check.** `SignInView`, `NewUserModal`, and `ConnectionBanner` don't depend on anything that changed this sprint. Checked against the dev server with curl:
  - log in, create a project, check out
  - check in more than the project holds (409)
  - a 2-second outage, then recovery
- **T8: "Checked Out" column.** The third column in `HardwareSetCard` and its `.hw-stats-3` style are commented out and marked "Future feature". It reads `hwSet.checkedOut`, which will come from the backend once that endpoint exists. A note at the check-in limit says the same field should replace `Number.MAX_SAFE_INTEGER`. While it stays commented out, the page looks the same.

### Still to do
- Check the T8 layout at desktop (1280px) and phone (375px) widths. Its box in `tasks/todo.md` is unchecked.

## 2026-10-09 — Math class and user-input tests

### Added
- `src/math.ts` with `IntMath`. `IntMath.parseInt(text)` only accepts plain whole numbers, with an optional minus sign and no leading zeros. Anything else returns `NaN`, and the quantity check then shows "Quantity must be a whole number!". The minus sign is allowed so that `-3` still gets the "greater than 0" message. It's named `IntMath` so it doesn't shadow JavaScript's built-in `Math`.
- `src/math.test.ts`. All 60 tests pass.

### Changed
- `HardwareSetCard.tsx` calls `IntMath.parseInt(qty)` instead of `Number(qty)`, so a blank field becomes `NaN` instead of `0` and `validateQuantity` rejects it.
- `validation.ts`: the `NaN` message is now "Quantity must be a whole number!" instead of "Quantity must be a number!", since `NaN` now also covers `2.5` and `1e0`. `validation.test.ts` was updated to match.

### Audit: text-to-number conversions
- `src/components/HardwareSetCard.tsx:19`: the Quantity box, the only number input in the app. It uses `IntMath.parseInt(qty)`.
- `mock-api.ts:96`: the mock reads `quantity` from the request body with `Number(b.quantity)`, then checks for a whole number above 0.
- `mock-api.ts:146`: the `?seconds=` param on the dev-only `/__mock/outage` route. Not user input.
- No decimal parser was added, since no field takes one.

### Known gaps
- If something sends `quantity` as the string `"1e0"`, the mock accepts it as 1. The page always sends a number, so normal users can't hit this. Fix: a one-line check that `quantity` is a number, not a string. (Fixed 2026-10-10.)
- Lint didn't print a final result and should be rerun.

## 2026-10-08 — Error handling, validation, mock API, and tests

### Added
- **`src/errors.ts`**: the app's error types, set up like a small Java exception hierarchy.
  - `AppError` extends `Error` and is the base class, so a component can catch any expected error with one type.
  - `ValidationError` is thrown in the browser before a request is sent, when input breaks a rule (empty, too short, bad characters, or a quantity ≤ 0 or above what's available). It holds a list of field/message issues (`userID`, `password`, `projectID`, `quantity`). Its message joins them all, and `messageFor(field)` returns the first message for one input box.
  - `ApiError` is thrown by `api.ts` when the Flask server rejects a request. It carries the HTTP status and has `isAuth()` (401/403), `isNotFound()` (404), `isConflict()` (409, e.g. someone else took the units first, so refetch and retry), and `isServer()` (5xx).
  - `NetworkError` is thrown by `api.ts` when nothing comes back: server down, network dropped, or over `REQUEST_TIMEOUT_MS` (8 seconds). It has no HTTP status. It was first written in `api.ts` and moved into `errors.ts` so all error types live in one file; `api.ts` and `api.test.ts` import it from there.
  - Usage: call the validator and then the API in the same `try` block, and pass the error to `errorMessage(err, "fallback text")` in the `catch`. The backend reruns every check, so `ApiError` and `NetworkError` still need handling even when local validation passes.
- **`src/validation.ts`**: the input rules. `errors.ts` defines what an error is; `validation.ts` decides when to throw one.
  - Constants at the top: `MIN_USERID_LENGTH`, `MIN_PASSWORD_LENGTH`, `MIN_PROJECT_ID_LENGTH`, and `ALLOWED_CHARS` (letters and digits, for userIDs and project IDs). Lengths are 0 as placeholders until the backend team agrees on values, since both sides must use the same rules.
  - Private checks (`checkRequired`, `checkUserID`, `checkPassword`, `checkProjectID`, `checkQuantity`) return the first broken rule's message or `null`, and don't throw. All of them call `checkRequired` first, so every form says "<label> is required!".
  - Exported validators throw a `ValidationError`:
    - `validateCreds(userID, password, mode)`: `"signIn"` only checks that both fields are filled in (the server decides if they're right, and older accounts keep working if rules get stricter). `"signUp"` applies every rule. Both fields are always checked, so the user sees all problems at once.
    - `validateProjectID(projectID)`: for the Create and Join forms.
    - `validateQuantity(value, max)`: `max` is units available for check-out, or units the project holds for check-in.
  - `src/validation.test.ts` covers sign-up, sign-in, project IDs, and quantities (39 tests passing).
- **Projects screen**: Create and Join show their own errors, with clear messages for a taken ID (409), an unknown ID (404), and joining a project you're already in. Picking a project shows a "Working under" card with its description and members from `/get_project_info`.
- **`haas-app/mock-db.ts`**: the in-memory tables, moved out of the mock API. The header comment says it isn't a final module.
  - Seeded logins: `testuser`/`test1234`, `alice`/`alice1234`, `bob`/`bob12345`. Three projects with members, and HWSet1/HWSet2 start partly checked out so the demo shows real numbers.
  - The mock tracks how many units each project holds and returns the errors from `docs/api_calls.pdf`: 409 for checking out more than available or checking in more than held, plus the project 404/409 cases. It used to silently clamp the numbers.
- **Network error handling**
  - `connection.ts` tracks whether the server is reachable. When it isn't, the header light turns red and a banner with "Retry now" appears. While offline it checks every 5 seconds and recovers on its own, then the projects and hardware screens reload.
  - The hardware card runs `validateQuantity` before sending. On a 409 or a dropped request, it re-reads that set's availability and tells the user the numbers were refreshed.
  - Demo: run `fetch('/__mock/outage?seconds=15', {method:'POST'})` in the browser console to cut off the API for 15 seconds.
- **Vitest** suites for `errors.ts`, `validation.ts`, `api.ts` (including going offline and recovering), and the mock's rules. `npm test` runs them all. A Commands section with the test commands was added to `CLAUDE.md`, and `docs/Mock-API-Notes.txt` was updated to drop the old clamping behavior.

### Open items
- Vitest only adds frontend tests and doesn't replace pytest, but `CLAUDE.md` lists pytest and stack changes need TA sign-off. Worth mentioning to the TA.
- `validateProjectID` exists but `ProjectsView` doesn't call it yet.
- `validateCreds` modes are ready but `SignInView` and `NewUserModal` don't use them yet.
- Check-in limit: waiting on the backend to return how many units a project holds. Until then, `HardwareSetCard` passes `Number.MAX_SAFE_INTEGER` as the check-in max.
- Backend asks: the frontend expects `/get_project_info` to return members, and the offline check calls `/get_all_hw_names`. A dedicated `/health` route would be better.
