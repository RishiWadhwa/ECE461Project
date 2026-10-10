# Implementation Plan: Frontend Final Sprint (10/10/2026)

Source: `docs/ChangePlanning.txt` (items 1–7). Tasks are listed in `tasks/todo.md`.

## Overview
This sprint finishes the explicit number classes in `math.ts`, sends all numeric input through them, and changes the app from tabs to three pages: Sign In → Projects (create or access) → Hardware. Check-out/check-in requests go through a session-only hashtable queue that is wiped on sign-out. The "My Projects" list is commented out, not deleted. A "Currently Checked Out" display is written but left commented out.

## Current state (verified 2026-10-10)
- **Build is broken.** `tsc -b` fails because `HardwareSetCard.tsx:6` imports `IntMath`, which no longer exists, and line 28 passes a `number` where `validateQuantity` now takes an `Integer`.
- **5 tests fail** in `validation.test.ts`. `checkQuantity` (`validation.ts:76-79`) calls `Number.isNaN` / `Number.isInteger` on an `Integer` object. `!Number.isInteger(obj)` is always true, so every quantity is rejected with "not a double".
- `Number()` is still called in three places: `math.ts:54` (inside `Integer.valueOf`, after the regex), `mock-api.ts:96` (check-in/out quantity) and `mock-api.ts:146` (dev-only outage seconds).
- `Double` and `Float` in `math.ts` are empty.
- `react-router` is not installed. Navigation is `section` state in `App.tsx`.

## Architecture Decisions
- **Pages are state in `App.tsx`, with no router.** `page: 'projects' | 'hardware'` replaces `section`. Sign-in is still "no userID". This adds no dependency (CLAUDE.md: keep the toolchain minimal). Smaller option skipped: URL paths and browser Back. Adding `react-router` later is a contained change.
- **`math.ts` is the only place a string becomes a number.** Each class checks the text with a strict regex before converting it, and no code calls `Number()`. Every caller uses `Integer` / `Double` / `Float`.
- **`validateQuantity` trusts the type.** An `Integer` is already a valid whole number, so the NaN and decimal checks move to the parse step. `NumberFormatError` from `Integer.valueOf` is mapped to "Quantity must be a whole number!". The other messages stay as they are.
- **The session queue is one module (`session.ts`) with a `Map` keyed by `projectID:hwSet`.** It chains each request onto the previous one's promise for that key, so double-clicks and rapid submits run in order. `clear()` is called from `signOut`. The database remains the only record of holdings.
- **"Access project" replaces "Join project".** It validates the ID and calls `getProjectInfo` to confirm the project exists (404 → error), then navigates. The `joinProject` call is commented out, not deleted.

## Dependency graph
```
math.ts (Integer, Double, Float)
  └── validation.ts (validateQuantity)
        └── HardwareSetCard ──┐
  └── mock-api.ts (quantity)  │
session.ts (queue) ───────────┤
App.tsx (pages, signOut→clear)┤
  ├── ProjectsView (create / access → onOpen)
  └── ResourcesView → HardwareSetCard (+ commented "checked out")
```

## Task List
### Phase 1: Numbers (fixes the build first)
- [x] T1: Make quantity validation work with `Integer` again (build and tests green)
- [x] T2: Finish `Double` and `Float`
- [x] T3: Replace the remaining `Number()` calls
### Checkpoint A: `npm test`, `npm run build` and `npm run lint` are clean

### Phase 2: Pages
- [x] T4: Move Hardware from a tab to its own page
- [x] T5: MVP Projects page (comment out My Projects, Join becomes Access)
### Checkpoint B: Sign in → create/access → hardware → back → sign out works in `npm run dev`

### Phase 3: Session and polish
- [x] T6: Session hashtable queue, wiped on sign-out
- [x] T7: Component regression pass (item 3)
- [x] T8: Commented-out "Currently Checked Out" display (item 7)
### Checkpoint C: Complete, ready for PR review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Build is already red, so later work stacks on broken code | High | T1 comes first, and Checkpoint A must be green before Phase 2 |
| `Double` parsing rounds wrongly | Low | Text is converted only after the strict regex passes, and tests pin the rounding |
| A session-side tally could count as "hard-coded/non-DB data" (R2-2) | Med | The queue holds only in-flight requests. Displayed numbers always come from the API |
| Check-in limit is not known client-side | Low | Unchanged: the server enforces it (409) and the card already handles 409 |
| Commented-out code drifts out of date | Low | Each commented block gets a one-line `// MVP: disabled until <feature>` note |

## Decisions (answered 2026-10-10)
1. `Double` and `Float` both **reject exponent notation** (`1e0`, `2E5`). Both classes are kept so every numeric form is covered. Neither is an accepted quantity input: they only classify decimal input so it gets the "not a double" message.
2. **No `Number()` anywhere**, including `Integer.valueOf`. It now accumulates digits itself.
3. The hashtable **only queues in-flight requests**. Per-project totals belong to the backend/database.
4. "Currently Checked Out" **waits for a backend endpoint**. The same endpoint may also give the check-in limit (the units a project holds).
5. Access Project: **checking that the project exists is enough** for now.
- The mock API mirrors the backend's API calls.
- **Workflow:** after each phase, show test results and stop so the user can push before the next phase starts.
