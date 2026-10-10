# Todo: Frontend Final Sprint

All commands run from `haas-app/`. See `tasks/plan.md` for decisions and open questions.

## Task 1: Make quantity validation work with `Integer` again
**Description:** Remove the dead `Number.isNaN`/`Number.isInteger` branches from `checkQuantity`. In `HardwareSetCard`, parse with `Integer.valueOf(qty)` inside the existing try, map `NumberFormatError` to "Quantity must be a whole number!", and pass `Integer.of(hwSet.available)` as the max.
**Acceptance criteria:**
- [x] `tsc -b` passes (no `IntMath`, no number→Integer mismatch)
- [x] All 5 failing `validateQuantity` tests pass with unchanged expected messages
- [x] Typing `1e0`, `2.5` or `abc` shows "Quantity must be a whole number!"
**Verification:** `npm test`, `npm run build`, manual check of check-out with bad input in `npm run dev`
**Dependencies:** None
**Files:** `src/validation.ts`, `src/components/HardwareSetCard.tsx`, `src/validation.test.ts` (one test for the parse-error message)
**Scope:** S

## Task 2: Finish `Double` and `Float`
**Description:** Mirror `Integer`: private constructor, `of`, `valueOf`, `doubleValue`/`floatValue`, `compareTo`, `toString`, `toJSON`, plus JSDoc in the same style. Rejects exponent notation (Decision 1).
**Acceptance criteria:**
- [x] `Integer.valueOf('1e0')` still throws (already true, kept as a regression test)
- [x] `Double`/`Float` accept and reject inputs per the agreed rules, throwing `NumberFormatError`
- [x] `NumberFormatError` JSDoc in `errors.ts` mentions the new classes
**Verification:** `npx vitest run src/math.test.ts`
**Dependencies:** None
**Files:** `src/math.ts`, `src/math.test.ts`, `src/errors.ts`
**Scope:** S

## Task 3: Replace the remaining `Number()` calls
**Description:** In `mock-api.ts`, `:96` becomes `Integer.of(b.quantity)` caught → 400 "Invalid quantity", and `:146` becomes `Integer.valueOf(...)`. Type `api.checkOut`/`checkIn` `quantity` as `Integer` (`toJSON` sends a plain number).
**Acceptance criteria:**
- [x] `grep -rn "Number(" src mock-*.ts` shows only `math.ts`
- [x] Mock API still returns 400 "Invalid quantity" for `2.5`, `0`, `"5"`, and the same 409s as before
**Verification:** `npx vitest run mock-api.test.ts src/api.test.ts`, `npm run build`
**Dependencies:** T1
**Files:** `mock-api.ts`, `mock-api.test.ts`, `src/api.ts`, `src/components/HardwareSetCard.tsx`
**Scope:** S

## Checkpoint A
- [x] `npm test` green, `npm run build` clean, `npm run lint` clean
- [ ] Review with team before page changes

## Task 4: Move Hardware from a tab to its own page
**Description:** In `App.tsx`, replace `section` + `SECTIONS` tabs with `page: 'projects' | 'hardware'`. The hardware page shows only when a project is open and has a "← Projects" button. Sign-out resets to sign-in. The hardware page keeps showing whole-system availability along with the current project's check-in/out.
**Acceptance criteria:**
- [x] No tab bar. Each view is a separate page in the same browser window
- [x] Hardware page header shows the current project ID, and Back returns to Projects
- [x] Sign Out from either page returns to sign-in
**Verification:** `npm run build`, manual flow in `npm run dev`
**Dependencies:** Checkpoint A
**Files:** `src/App.tsx`, `src/components/ResourcesView.tsx`, `src/index.css` (only if tab styles leave a gap)
**Scope:** S

## Task 5: MVP Projects page
**Description:** Comment out (do not delete) the My Projects list, `getUserProjects`/`refresh`, the `selected` info card, and the `joinProject` call, each with an `// MVP:` note. Rename Join to "Access Project": `getProjectInfo` (no `validateProjectID`, because seeded IDs like `demo1` are shorter than the create rule) (404 shows an error) → open the hardware page. Create also opens the hardware page.
**Acceptance criteria:**
- [x] After sign-in the user sees only the Create Project and Access Project forms
- [x] (API checked; UI not clicked through) Accessing a nonexistent ID shows an error. A valid ID opens that project's hardware page
- [x] No `getUserProjects`/`joinProject` request in the Network tab
**Verification:** `npm run build`, `npm run lint` (no unused-import errors), manual flow
**Dependencies:** T4
**Files:** `src/components/ProjectsView.tsx`, `src/App.tsx`
**Scope:** S

## Checkpoint B
- [ ] (API flow checked with curl; browser click-through pending) Sign in → create → hardware → back → access → hardware → sign out all work
- [x] Tests and build green

## Task 6: Session hashtable queue
**Description:** New `src/session.ts` exporting `enqueue(key, fn)` and `clear()`, backed by `Map<string, Promise<unknown>>`. Each request chains onto the previous one for its key, and finished entries are removed. `HardwareSetCard.submit` wraps its API call in `enqueue(\`${projectID}:${hwSet.name}\`, ...)`, and `signOut` calls `clear()`. In-flight requests only (Decision 3).
**Acceptance criteria:**
- [x] Two quick submits on the same set run one after another, never at the same time
- [x] After sign-out the map is empty, and nothing about the user or project remains client-side
- [x] A rejected request does not block later ones for that key
**Verification:** `npx vitest run src/session.test.ts` (order, failure isolation, clear)
**Dependencies:** T4
**Files:** `src/session.ts`, `src/session.test.ts`, `src/components/HardwareSetCard.tsx`, `src/App.tsx`
**Scope:** M

## Task 7: Component regression pass
**Description:** Check each component against current behavior: SignInView and NewUserModal (`validateCreds` modes), ConnectionBanner (offline/online), HardwareSetCard (ok/warn/error messages, 409 refresh), ResourcesView (load, offline reload). Fix only what broke.
**Acceptance criteria:**
- [x] Every component behaves as it did before the sprint, or a difference is written up
- [x] Mock outage (`POST /__mock/outage?seconds=15`) still shows the banner and recovers
**Verification:** manual checklist in `npm run dev`, `npm test`
**Dependencies:** T5, T6
**Files:** `src/components/*` (read, then fix only what broke)
**Scope:** S

## Task 8: Commented-out "Currently Checked Out" display
**Description:** Add a third `hw-stats` column, "Checked Out (project)", to `HardwareSetCard`, sized like Capacity/Available so nothing overlaps. Leave the whole thing commented out with `// Future feature: enable after checkpoint`. Data comes from a future backend endpoint (Decision 4).
**Acceptance criteria:**
- [ ] When the code is temporarily uncommented, three stats fit in one row at desktop and phone width without overlap
- [x] When committed commented out, the UI is identical to before and the build is clean
**Verification:** temporarily uncomment it, check at 1280px and 375px, re-comment, then `npm run build`
**Dependencies:** T7
**Files:** `src/components/HardwareSetCard.tsx`, `src/index.css`
**Scope:** S

## Checkpoint C
- [ ] All acceptance criteria met, `npm test`/`build`/`lint` green
- [ ] PR description states the design decisions (pages without router, math.ts as the single parse point, session queue)

## Added during Phase 3
- [x] Seeded project IDs renamed to meet the 8-char rule (demoproj1, rflabproj, edgeproj42). Access Project runs validateProjectID again, so too-short IDs fail locally and well-formed unknown IDs get a 404.
