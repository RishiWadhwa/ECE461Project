# Frontend Upgrade Plan (`feat/FE_Upgrade`)

Branch: `feat/FE_Upgrade`, cut from `main` at `b04c889` (PR #70, the MVP build).
Scope: **frontend (`haas-app/`) plus two small read-only backend routes** added on 2026-11-18 for the live display
(`GET /health`, `GET /hw_availability`; see **Live display and networking updates**). Everything else in this plan
uses routes that already existed. Every value on screen still comes from the API (R2-2); the only new static text
is UI copy (labels, hints, help text), never user, project, or hardware data.

**Status as of 2026-11-18:** F1, F3–F8, F10, F11, F13, N1, and the live display and networking work (L1–L3) are
done and merged into `feat/FE_Upgrade`. N2a–N2g were not built and are cut from this round (see **N2**). The
branch is ready for the PR into `main`.

## Contents

| ID | Feature | Size | Status (completed) |
|----|---------|------|--------------------|
| F1 | Stay signed in after a page refresh | S | Done 2026-11-15 |
| F3 | Press Enter to check out | S | Done 2026-11-15 |
| F4 | "Max" and +/− buttons on the quantity box | S | Done 2026-11-15 |
| F5 | Low-stock warning on the availability bar | S | Done 2026-11-15 |
| F6 | Keep hardware numbers current (refresh button + polling) | S | Done 2026-11-15; reworked 2026-11-18 (L1) |
| F7 | Copy project ID | S | Done 2026-11-15 |
| F8 | Search and sort My Projects | S | Done 2026-11-15 |
| F10 | Sign in automatically after sign-up | S | Done 2026-11-15 |
| F11 | Turn off write buttons while offline | S | Done 2026-11-15; offline detection reworked 2026-11-18 (L2) |
| F13 | This session's activity on a project | M | Done 2026-11-15 |
| N1 | Show field requirements while typing | M | Done 2026-11-15; Sign In hints and validation refactor 2026-11-18 (L3) |
| N2 | Fill the empty space (several small layout additions) | M | Not built; cut from this round (2026-11-18) |
| L1 | Live hardware display: one `GET /hw_availability` per poll, in a `useLiveHardware` hook | M | Done 2026-11-18 |
| L2 | Constant health heartbeat on `GET /health` | S | Done 2026-11-18 |
| L3 | Live green requirement checks on Sign In | S | Done 2026-11-18 |

IDs F1–F13 match the numbers in the original feature list; F2, F9, F12, and F14 were not picked for this round.
L1–L3 were added after the plan was written (2026-11-18).

---

## Ground rules for this branch

- One PR per slice (see **Order of work**), each merged into `feat/FE_Upgrade`; then one PR from
  `feat/FE_Upgrade` into `main`.
- Components keep calling `api.*` only; nothing new calls `fetch` directly (api.ts design, roadmap section 12).
- New logic that has branches (storage helpers, rule checklists, filters) gets a vitest case next to the
  existing `src/*.test.ts` files. Pure UI tweaks need none.
- Each PR runs `npm test`, `npm run lint`, and `npm run build`, and gets a click-through with `npm run dev`
  (mock API) before review.
- No new npm dependencies. Everything below can be done with React, the browser APIs, and the existing CSS tokens
  in `index.css` (`--orange`, `--red`, `--green`, `--surface*`).
- Each PR description states the design decision and why it was chosen (needed for Midterm 2).

---

## F1. Stay signed in after a page refresh

**Problem.** `userID` and `projectID` exist only in React state in `App.tsx`, so a page refresh signs the user out.

**Approach.**
- Add two small helpers to `session.ts`: `saveNav({ userID, projectID })` and `loadNav()`, backed by
  `sessionStorage` (cleared when the tab closes, and not shared between tabs).
- Wrap every storage read and write in `try/catch`. Private windows and blocked storage throw, and the app must
  then behave exactly as it does today.
- `App.tsx`: start `useState` with the value from `loadNav()`, and save on every change.
- `clear()` in `session.ts` (already called on sign-out) also removes the stored values.

**Caveat (write this in the PR).** This keeps only the userID in the browser; there is still no session token,
so it is a convenience, not authentication. That is acceptable for the proof of concept, and it matches roadmap
section 10.

**Done when.** Refreshing on the Projects page or the Resources page returns to the same page as the same user.
Sign Out followed by a refresh shows Sign In. A storage error falls back to the Sign In page with no crash.

**Tests.** `session.test.ts`: save/load round-trip, `clear()` wipes it, and a throwing `sessionStorage` returns null.

---

## F3. Press Enter to check out

**Problem.** The quantity box in `HardwareSetCard.tsx` is not inside a `<form>`, so pressing Enter does nothing.

**Approach.** Wrap the quantity row and the buttons in a `<form onSubmit>` that calls `submit('out')`. Give Check In
`type="button"` so that only Check Out runs on Enter. Check-out is the default because it is the more common action.

**Done when.** Typing `3` and pressing Enter checks out 3 units. Enter with an empty box does nothing, because the
button is disabled.

---

## F4. "Max" and +/− buttons on the quantity box

**Approach.**
- `−` / `+` change the number by 1, using `Integer.valueOf(qty)` from `math.ts`. When the box is empty or invalid,
  they start from 0. Never go below 0.
- "Max" fills in `hwSet.available`.
- The buttons only change the text in the box. All validation still happens in `submit()`, so the
  `validateQuantity` rules stay in one place.
- Check-in has no upper limit on the frontend until the backend sends `checkedOut`, so "Max" means "max to
  check out". Its label or tooltip says so.

**Done when.** `+` from empty gives `1`, `−` at `0` stays `0`, and Max shows the current available count
(which updates after F6 refreshes the numbers).

---

## F5. Low-stock warning on the availability bar

**Approach.**
- In `HardwareSetCard.tsx`, compute the level from `pct`: `ok` when ≥ 25%, `low` when < 25%, `empty` when it
  is 0. Add it as a class on `.meter-fill` (`meter-low`, `meter-empty`).
- CSS: the bar stays orange when ok, turns `--orange-light` with a pulse when low, and `--red` when empty.
  Respect `prefers-reduced-motion`, which turns the pulse off.
- When `available === 0`, disable Check Out and show an "All units checked out" label.
- Pick the 25% threshold once, as a named constant in the component.

**Done when.** The bar's color matches the level, and Check Out is disabled at 0 but Check In still works.

---

## F6. Keep hardware numbers current

**Problem.** `ResourcesView.tsx` loads the numbers once, then again only when the server comes back after an outage.
Check-outs by other users don't show up.

**Approach.**
- Move the existing loader into a `load()` function inside the component.
- Add a ↻ button next to the section title that calls `load()`.
- Poll every 15 s with `setInterval`, but skip a tick when `document.visibilityState !== 'visible'` or the
  connection is offline. Clear the interval on unmount.
- Polling replaces `sets` wholesale. Each `HardwareSetCard` is keyed by name and keeps its own typed quantity, so
  a refresh does not wipe what the user is typing.
- Show "Updated hh:mm:ss" next to the button, which also uses some of the empty header space (see N2).

**Done when.** A check-out in a second tab shows up in the first within about 15 s. A hidden tab makes no requests.

**Update (2026-11-18).** The loader and the 15 s poll no longer live in `ResourcesView.tsx`; they moved into
`useLiveHardware.ts` (see L1). The behavior above is unchanged, but each poll is now a single request.

---

## F7. Copy project ID

**Approach.** Add a "Copy ID" button in the "Working under" card in `ResourcesView.tsx`. It calls
`navigator.clipboard.writeText(projectID)` and shows "Copied" for 2 s. On failure (insecure context or permission
denied), it shows "Copy failed — the ID is PROJ001" so the user can copy the ID by hand.

**Done when.** Clicking the button puts the ID on the clipboard, and the failure path shows the ID in the message.

---

## F8. Search and sort My Projects

**Approach.**
- `ProjectsView.tsx`: add a filter box and a sort `<select>` (Name A–Z or Project ID) above the project grid.
- Filtering and sorting happen in the browser on the list that is already loaded, so no new requests are made.
  The match is case-insensitive on name or ID.
- Put the filter-and-sort step in a small pure function (`filterProjects(projects, query, sort)`) so it can be tested.
- Show the controls only when the user has 2 or more projects. Show "No projects match 'xyz'" when nothing matches.

**Tests.** A unit test for `filterProjects`: a case-insensitive match on name and on ID, both sort orders, and an
empty query that returns the whole list.

---

## F10. Sign in automatically after sign-up

**Problem.** After creating an account, the user is sent back to Sign In with the userID filled in and has to type
the password again.

**Approach.**
- After `api.addUser(creds)` succeeds in `NewUserModal`, call
  `api.login(validateCreds(userID, password, 'signIn'))`.
- Replace the `onCreated(userID)` prop with `onSignedIn(userID)`, passed through from `SignInView`'s own prop.
- If the login fails after the account was created, fall back to today's behavior: close the modal, fill in the
  userID, and show "Account created — please sign in."

**Done when.** A new account lands on the Projects page in one step. If the login is forced to fail, the user still
gets the fallback flow.

---

## F11. Turn off write buttons while offline

**Problem.** Check Out, Check In, Create, and Join stay clickable while the server is unreachable, and then fail.

**Approach.**
- Read `useConnectionStatus()` in `HardwareSetCard.tsx` (`ProjectsView.tsx` already does).
- Disable those four buttons when `connection === 'offline'`, with
  `title="Unavailable while the server is unreachable"`.
- Sign In and New User stay enabled. Their requests fail with the existing message, and that request is also what
  detects that the server is back.

**Done when.** With Flask stopped (`npm run dev:prod`), the write buttons are disabled with a tooltip, and they turn
back on by themselves when the probe succeeds.

**Update (2026-11-18).** The probe is now the `GET /health` heartbeat (see L2), so the buttons also turn back on
only once MongoDB is reachable, not just Flask.

---

## F13. This session's activity on a project

**Problem.** After a check-out or check-in, the only trace is a message on the card that disappears on the next
action. There is nowhere to see what you did to a project in this session, and the page has empty space for it.

**Approach.**
- Keep the log in `session.ts`, next to the request queue, as a module-level list of entries:
  `{ time, projectID, hwSet, kind: 'out' | 'in', quantity }`. It lives there, and not in `ResourcesView` state, so
  it survives going back to Projects and opening another project during the same sign-in.
- Expose it with `recordActivity(entry)` and `getActivity(projectID)`, and let components subscribe with
  `useSyncExternalStore`, the same pattern `connection.ts` already uses for the status light.
- `HardwareSetCard.tsx` calls `recordActivity` only after the server confirmed the request (where it already
  calls `onChange(updated)`). A failed or conflicting request is not recorded, so the log shows what the database
  accepted.
- Keep it **in memory only**: not `sessionStorage` (F1), so a refresh clears it. It is a display list of this tab's
  actions, never totals, which matches the rule in `session.ts` that the database is the only record of what a
  project holds.
- Cap the list at 50 entries (drop the oldest), and wipe it in `clear()` on sign-out.
- New component `components/ActivityList.tsx` renders the entries for the open project, newest first, as
  `hh:mm:ss · Checked out 5 × HWSet1`. The empty state reads "Nothing yet. Check hardware in or out and it
  will show up here."
- The panel is titled "Your activity this session" and says that it only lists actions made in this tab, so
  nobody reads it as the project's full history (other users and other tabs are not included).
- Place it on the Resources page under the project card. In the N2e two-column layout it goes in the left sidebar.

**Done when.** A check-out then a check-in appear in the list in that order, newest first. A 409 does not add an
entry. Going to Projects and back keeps the list, a different project shows its own entries, and Sign Out or a
refresh empties it.

**Tests.** `session.test.ts`: entries come back newest first, the per-project filter, the 50-entry cap, `clear()`
wipes the log, and a subscriber is notified on record and on clear.

---

## N1. Show field requirements while typing

**Goal.** Show each field's rules while the user is typing, not only after a failed submit. The form box grows
smoothly to fit the hints and shrinks back when they go away, so nothing below jumps.

**Fields.** Sign-up User ID and Password (`NewUserModal`), Create Project ID and Join Project ID (`ProjectsView`),
and Sign In User ID and Password (`SignInView`; see the note below).

**Approach.**
1. **One source for the rules, in `validation.ts`.** Export `userIDRules(value)`, `passwordRules(value)`, and
   `projectIDRules(value)`. Each returns a list of `{ label, met }`, for example
   `[{ label: '5–16 characters', met: true }, { label: 'Letters and digits only', met: false }]`.
   They use the same `MIN_*` / `MAX_*` / `ALLOWED_CHARS` constants as the existing `check*` functions, so the
   hints and the validators cannot drift apart.
2. **New component `components/FieldHints.tsx`** (`{ rules, open }`). It renders a `<ul>` checklist: ✓ green when a
   rule is met, • muted when it is not. It uses `aria-live="polite"`, and the input points to it with
   `aria-describedby`.
3. **The hints show while the field has focus, or while it has text that still breaks a rule.** They hide once the
   field is empty and unfocused, or once every rule is met and the field has lost focus.
4. **Smooth expand and shrink, in CSS only.** Put the list in a wrapper with
   `display: grid; grid-template-rows: 0fr → 1fr; transition: grid-template-rows .2s`. The inner element gets
   `overflow: hidden`, so the panel grows to its real height without hard-coded heights. Turn the transition off
   under `prefers-reduced-motion`.
5. **Server errors stay where they are.** The existing `msg-error` line still shows server errors (409 taken, 401,
   404), because those can't be known while the user types.
6. **Sign In still accepts any non-empty value** (older accounts keep working), so the checklist never blocks
   submit. *Changed 2026-11-18:* it was first built as neutral lines with no met/not-met state, but now it shows
   the same live green checks as sign-up (L3), as guidance only.

**Decision (resolved).** The frontend project ID rule now matches Flask's: `PROJ` followed by digits, at least 8
characters in all (so `PROJ` and at least 4 digits), case-insensitive. Every ID the frontend accepts also passes
`backend/project_routes.py` (`PROJ` and at least 3 digits, uppercased), so users no longer get 400s from a
rule the hints didn't show.

**Refactor (2026-11-18).** `checkUserID`, `checkPassword`, and `checkProjectID` now test every rule and return a
bitmask of the rules broken (0 means valid). `validateCreds` and `validateProjectID` turn the lowest set bit into
the same message as before, and `userIDRules`, `passwordRules`, and `projectIDRules` read their lines from the
same masks. Each rule is written once, so a checklist cannot disagree with what the form accepts.

**Tests.** `validation.test.ts`: each `*Rules()` function at the edge lengths and with bad characters, and every
rule list reports all-met exactly when the matching `validate*` function accepts the value.

---

## N2. Fill the empty space (OPTIONAL)

**Status (2026-11-18): not built.** None of N2a–N2g shipped in this round; time went to the live display and
networking work (L1–L3) instead. The Resources page already has a two-column activity split from F13, but not the
N2e sidebar. The table below is kept as the design for a later round.

The app feels empty because content sits at the top-left of a wide dark page. Every item below fills space with live
data or useful copy, never hard-coded records (R2-2).

| ID | Idea | Where | Data source |
|----|------|-------|-------------|
| N2a | **Centered content width.** Cap `.content` at about 1200 px and center it, so wide screens don't stretch two small cards across the page. | `index.css` | none (CSS) |
| N2b | **"Hardware at a glance" panel on the Projects page.** A live summary of each set: name, available / capacity, and a small bar. Also the total across all sets ("142 of 200 units available"). | `ProjectsView.tsx` (new `PoolSummary.tsx`) | `getHardwareNames` + `getHardwareInfo` (existing) |
| N2c | **Live pool status on the Sign In page.** A split layout: the sign-in form on one side, and on the other a "Right now: N units available across M hardware sets" panel with the same bars. `/get_all_hw_names` needs no login (roadmap section 1), and `/get_hw_info` doesn't either today. | `SignInView.tsx` (reuses `PoolSummary`) | same as N2b |
| N2d | **A useful empty state.** When the user has no projects, replace the single line of text with a "Getting started" card: 1) create a project, 2) or join one with an ID from a teammate, 3) then check hardware in or out. The steps link to and focus the matching form. | `ProjectsView.tsx` | none (UI copy) |
| N2e | **Two-column Resources page.** A left sidebar holds the project card (name, description, members, Copy ID from F7, the "Updated" time from F6). The right side holds the hardware cards. This uses the horizontal space and keeps the project context visible. | `ResourcesView.tsx`, `index.css` | `getProjectInfo` (existing) |
| N2f | **Larger hardware cards.** Swap the 4 px bar for a thicker bar with the percentage label, and show "In use" (= capacity − available, worked out on screen) as a third stat in the existing `.hw-stats-3` slot. It shows units in use by **all** projects, not this project's holdings (that needs the backend; see below). | `HardwareSetCard.tsx` | existing `HardwareSet` fields |
| N2g | **Breadcrumb in the header.** `Projects › PROJ001`, where clicking "Projects" goes back. It fills the empty header middle and makes the back button unnecessary on wide screens. | `App.tsx` | current state |

**Recommended for this week:** N2a, N2b, N2d, N2e (they give the most visible change). N2c, N2f, and N2g if there's
time. N2b and N2c share one component, so N2c is cheap once N2b exists.

**Check for N2c.** If the team later puts login in front of `/get_hw_info`, the Sign In panel must hide itself on a
401 instead of showing an error.

---

## Live display and networking updates (added 2026-11-18)

These came after the plan above and are the only part of this branch that touches Flask. Both new routes are
read-only, and neither changes an existing route.

### L1. Live hardware display

- **Backend.** `GET /hw_availability` returns every set's `name`, `capacity`, and `available` in one read. It
  replaces the names-then-info-per-set calls (`/get_all_hw_names` plus `/get_hw_info` for each set) that the
  Resources page used to poll with. With an optional `projectID` each set also carries `checkedOut` (units that
  project holds), matching `/get_hw_info`, so the per-project numbers and the check-in limit survive the switch.
- **Client.** `api.getHardwareAvailability` calls it; the dev mock (`mock-api.ts`) serves it too.
- **Hook.** `useLiveHardware.ts` owns the 15 s poll (`POLL_INTERVAL_MS`), skips a tick when the tab is hidden or
  the connection is offline, reloads when the server comes back, and uses a version guard so a slow response can't
  overwrite a newer one. `ResourcesView.tsx` just reads the hook.
- **Known limit.** The route reads projects and hardware separately, so a check-out that commits between the two
  reads can make one response mix numbers from before and after it. That only affects what is shown (the next poll
  matches), because `check_out` re-validates inside its transaction. A real-MongoDB test (skipped without
  `TEST_MONGO_URI`) checks that no number leaves 0..capacity under concurrent check-outs.

### L2. Health heartbeat

- **Backend.** `GET /health` runs MongoDB's `ping` (capped at 2 s), so a green status means Flask **and** the
  database are up. A failed ping becomes the existing 503 for `ConnectionFailure`.
- **Client.** `connection.ts` pings it every 5 s (`PROBE_INTERVAL_MS`) whether the app is online or offline, so
  the status light turns red when Flask or MongoDB goes down while the page sits idle, instead of only after the
  next user request fails. Hidden tabs skip pings and check again when shown, and a ping never starts while the
  previous one is still waiting. `markOnline` and `markOffline` now only set the status; the old probe timer is
  gone. `main.tsx` starts the heartbeat once, outside React, so StrictMode cannot start a second one.
- **Known limit.** The Resources 15 s poll still runs alongside the heartbeat, so the page makes both requests.

### L3. Live checks on Sign In

`SignInView.tsx` passes `userIDRules` and `passwordRules` from `validation.ts` to `useHints` and `FieldHints`, the
same wiring as `NewUserModal`, so each rule turns green as it is met. They are guidance only: submit still accepts
any non-empty value so older accounts keep working.

**Tests.** `api.test.ts` covers the health ping, the heartbeat timing, and `getHardwareAvailability` with and
without `projectID`. `mock-api.test.ts` covers both mock routes. `backend/tests/test_app.py` and
`test_hardware.py` cover `/health` and `/hw_availability`.

---

## Timeline (actual completion dates)

Everything in scope is complete as of **2026-11-18** (today). Nothing is scheduled after this date.

| Slice | Contents | Completed |
|-------|----------|-----------|
| 1 | F1, F11 | 2026-11-15 |
| 2 | F3, F4, F5 | 2026-11-15 |
| 3 | F6, F7, F13 | 2026-11-15 |
| 4 | F8 | 2026-11-15 |
| 5 | N1, F10 | 2026-11-15 |
| 6 | Split deploy (Netlify frontend, hosted Flask) and a script to run the server locally | 2026-11-16 |
| 7 | Validation refactor (bitmask rules), L1 live display, L2 heartbeat, L3 Sign In checks | 2026-11-18 |
| — | N2a–N2g | Not built; cut from this round (2026-11-18) |

Original order and reasons: slice 1 (F1, F11) fixed confusing behavior and touched only App, session, and the
button `disabled` props. Slice 2 (F3, F4, F5) was all in `HardwareSetCard.tsx`, so it was reviewed together to avoid
merge conflicts. Slice 3 (F6, F7, F13) was all on the Resources page. Slice 4 was the Projects page. Slice 5 was the
forms. Slice 4's N2a, N2b, N2d and the N2e sidebar in slice 3, plus the N2c, N2f, N2g stretch slice, did not ship.

---

## Not in this plan because they need backend work

- **Units this project holds (a "Checked Out" stat on each card).** `HardwareSetCard.tsx` already has a commented-out
  slot for it. It needs `get_hw_info` to accept `projectID` and return `checkedOut` (roadmap sections 7.1 and 8).
  It would also give check-in a real upper limit on the frontend, replacing `Number.MAX_SAFE_INTEGER`.
- **Leave project, delete project, change password.** These need new routes.
- **Members on each project card in My Projects.** This would take one `getProjectInfo` request per card. A better
  fix is for the backend to include `members` (or a count) in `get_user_projects_list`.

## Open questions for the team

1. ~~N1: should the frontend project ID rule be changed to match Flask's `PROJ###` rule?~~ Resolved: it now
   matches (see N1).
2. F6 / L2: is a 15 s hardware poll plus a 5 s heartbeat acceptable for the Atlas free tier, or should the poll be
   30 s? The two timers run independently.
3. N2c: is it fine to show pool status to visitors who haven't signed in? The data is not user-specific. (Only
   matters if N2 is picked up later.)
