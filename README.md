# ECE 461 HaaS Proof of Concept — GameVault

Hardware-as-a-Service (HaaS) web application inspired by the University of Utah [POWDER](https://powderwireless.net/) program, themed as a game-store rental system ("GameVault"). Users sign in, form or join a **team** (family/friend group), and check out / check in shared **consoles** and **cartridges** from the store's single shared inventory.

The course spec's generic "project" concept maps to a **team** here: teams don't get their own private inventory — they draw from the same shared pool of consoles and cartridges as everyone else — but anyone on a team can see and manage that team's active checkouts together (e.g., one family member can check in something another member checked out).

This repository is the single deliverable repo for all project phases.

---

## Phase 1 Deliverables


| ID   | Requirement                                                         | Status                                                                                  |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| R1-1 | Project plan (team, sprints, collaboration, methodology, toolchain) | In this README                                                                          |
| R1-2 | All features on a board, with initial work items                    | [User stories](#r1-2-features-and-work-items) below; copy onto the GitHub Project board |
| R1-3 | High-level application sketch                                       | [Sketch](docs/architecture/sketch.svg) below                                           |
| R1-4 | Choice of tools and approach                                        | [Toolchain](#toolchain-and-approach)                                                    |


---



## R1-1 Project Plan



### Team


| Name         | Role                   | GitHub                                        |
| ------------ | ---------------------- | --------------------------------------------- |
| Tyler Tekin | Backend (Java/Python) | [TylerTekin](https://github.com/tyler-at) |
| Joseph Gyomber | Backend (Java/Python) | [JGyomber](https://github.com/jgyomber) |
| May He | Backend (Node.js) | [Maaay551](https://github.com/maaay551) |
| Nolan Arellano | Frontend (TypeScript) | [Cypher-Geist](https://github.com/cypher-geist) |
| Abdon Morales | Frontend (TypeScript) | [AbdonMorales](https://github.com/abdonmorales) |
| Rishi Wadhwa | Database/Cloud Deployment (MongoDB/Heroku) | [RishiWadhwa](https://github.com/RishiWadhwa) |

 
Roles are a starting split, not hard ownership. Work is assigned per sprint from the board.

### Implementation methodology

We are using **Agile Scrum**:

- Work is planned as user stories, research spikes, and technical-debt items.
- Each story is small enough for one person or a pair, written in three sentences or less, and mapped to a stakeholder need.
- GitHub **Projects** holds user stories. GitHub **Issues** holds bugs and improvements. Those are kept on separate boards, per course guidance.
- Changes land through pull requests into `dev`, then `main` for phase submissions.



### Sprint cadence and velocity


| Item             | Plan                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Sprint length    | 1 week                                                                                      |
| Sprint planning  | Monday 3:00-4:00pm @ Senior Design Room                                                     |
| Standups         | 3x / week, 10 min (Slack huddle or Zoom)                                                    |
| Review + retro   | Friday in lab/recitation                                                                    |


Phase-level targets:


| Phase   | Goal                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| Phase 1 | Plan, board, toolchain                                                                                       |
| Phase 2 | Hardware and user/project data in MongoDB, APIs used by the app (no hard-coded page data), cloud URL for TAs |




### Collaboration tools


| Tool             | Use                                                              |
| ---------------- | ---------------------------------------------------------------- |
| GitHub           | Source control, PRs, code review                                 |
| GitHub Projects  | Task reporting (Backlog → Ready → In Progress → Review → Done)   |
| GitHub Issues    | Bugs and improvements only (separate from the story board)       |
| Messages         | Daily chat, standup notes, blockers                              |
| Zoom             | Planning, reviews, pairing                                       |
| VS Code          | Development IDE                                                  |




### Branching

- `main` — phase deliverables
- `dev` — integration branch (current working branch)
- `feature/<short-name>` — one story or spike per branch

---



## Toolchain and Approach

Chosen stack (discussed with the team; not the Python/Flask default from the [AppDev template](https://github.com/ashwin-ram03/AppDevProjectTemplate)):


| Layer             | Choice                                                            | Why                                                                                                                |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend          | React                                                             | Course-recommended UI; component model fits login, projects, and hardware panels                                   |
| Backend           | Node.js (JavaScript) **and** Java                                 | JS for auth/session and React-friendly JSON APIs; Java for hardware checkout rules and concurrent resource updates |
| Database          | MongoDB                                                           | Course-recommended; document model fits users, projects, and hardware sets                                         |
| API style         | REST over HTTP                                                    | Matches the template’s route split (`/login`, `/create_team`, `/check_out`, `/check_in`, …)                        |
| Auth              | Hashed passwords (bcrypt or equivalent); no plaintext credentials | SR3 / SN1                                                                                                          |
| Testing           | Jest (JS), JUnit (Java)                                           | Unit tests around login, team membership, and checkout math                                                        |
| Hosting (Phase 2) | Cloud URL (Render, Railway, or Heroku)                            | R2-3: TAs must open the app in a browser                                                                           |
| CI                | GitHub Actions (Phase 2)                                          | Lint + tests on PRs                                                                                                |




### Planned service split

```
React client
    ├── Node.js API     users, login, teams
    └── Java API        consoles / cartridges, checkout, check-in
            └── MongoDB (users, teams, hardwareSets)
```

Template-aligned API surface we will implement (`project` renamed `team` to match the game-store theme):


| Area     | Endpoints                                                                           |
| -------- | ------------------------------------------------------------------------------------ |
| Users    | `/login`, `/add_user`, `/get_user_teams_list`, `/join_team`                         |
| Teams    | `/create_team`, `/get_team_info`                                                    |
| Hardware | `/get_all_hw_names`, `/get_hw_info`, `/check_out`, `/check_in`, `/create_hardware_set` |

`hardwareSets` holds two sets for the MVP: **Consoles** (e.g. PS5, Switch, Xbox units) and **Cartridges** (game titles). Each set has a `capacity` (total owned) and `available` (not currently checked out).




### Planned repo layout

```
client/          React app
server-js/       Node.js user + team API
server-java/     Java hardware (console / cartridge) API
README.md
```

---



## Stakeholder needs and system requirements


| ID  | Need / requirement                                                        |
| --- | -------------------------------------------------------------------------- |
| SN0 | Accepted quality and reliability metrics                                  |
| SN1 | Secure user accounts and teams                                            |
| SN2 | View status of all consoles and cartridges in the store                   |
| SN3 | Request available consoles / cartridges                                   |
| SN4 | Checkout and manage rented consoles / cartridges                          |
| SN5 | Check-in rentals and refresh store availability                          |
| SN6 | Deliver PoC on schedule, with room to scale                               |
| SR1 | Delivered within schedule, with periodic stakeholder updates              |
| SR2 | Front-end for inputs and outputs                                          |
| SR3 | Encrypted user-id and password                                            |
| SR4 | Create new teams or join existing ones                                    |
| SR5 | Database for users, team codes, team details, and console/cartridge data  |


---



## R1-2 Features and Work Items

Create a **GitHub Project** named `HaaS User Stories` with columns **Backlog**, **Ready**, **In Progress**, **Review**, and **Done**. Add each item below as a card. Do **not** mix bugs onto this board.

Labels: `user-story`, `research`, `tech-debt`, `phase-1`, `phase-2`.

### Feature 1 — User & team management


| ID    | Type       | Story                                                                                                                              | Points | Phase | Maps to       |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- | ------------- |
| US-01 | User story | As a new customer, I want to create an account with a userid and password so that I can start renting consoles and cartridges.       | 3      | 2     | SN1, SR2, SR4 |
| US-02 | User story | As a registered customer, I want to sign in with my userid and password so that I can reach my rentals.                              | 3      | 2     | SN1, SR2      |
| US-03 | User story | As a user, I want my password stored hashed (never plaintext) so that my account stays secure if the database is exposed.            | 5      | 2     | SN1, SR3      |
| US-04 | User story | As a signed-in user, I want to create a team with a name, description, and teamID so that my family/friends can share one rental pool. | 3      | 2     | SN1, SR4, SR5 |
| US-05 | User story | As a signed-in user, I want to join an existing team by teamID so that I can see and manage rentals with that group.                  | 3      | 2     | SN1, SR4      |
| US-06 | User story | As a signed-in user, I want to see the teams I belong to so that I can pick one before checking out a console or cartridge.           | 2      | 2     | SN1, SR2, SR5 |




### Feature 2 — Console & cartridge rentals


| ID    | Type       | Story                                                                                                                                                    | Points | Phase | Maps to       |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------------- |
| US-07 | User story | As a team member, I want to see how many consoles and cartridges the store owns in total so that I know the full catalog size.                             | 2      | 2     | SN2, SR2, SR5 |
| US-08 | User story | As a team member, I want to see how many consoles and cartridges are currently available so that I know what I can actually rent right now.                | 2      | 2     | SN2, SN3, SR5 |
| US-09 | User story | As a team member, I want to enter how many units of a console or cartridge to check out so that my team can reserve them for pickup.                        | 5      | 2     | SN3, SN4      |
| US-10 | User story | As a team member, I want to check in a console or cartridge my team is holding so that it returns to the store's shared pool.                               | 5      | 2     | SN4, SN5      |
| US-11 | User story | As a team member, I want checkout and check-in to persist in the database so that every customer sees the same live availability.                          | 5      | 2     | SN2, SN5, SR5 |
| US-12 | User story | As a user of the app, I want all user, team, console, and cartridge data loaded from APIs (no hard-coded page data) so that the UI reflects the live store. | 3      | 2     | SN0, SR2, SR5 |




### Feature 3 — Platform and delivery


| ID    | Type       | Story                                                                                                                                | Points | Phase | Maps to  |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | -------- |
| US-13 | User story | As a TA, I want the PoC hosted at a public URL so that I can grade the running app.                                                     | 5      | 2     | SN6, SR1 |
| US-14 | User story | As a developer, I want REST endpoints for users, teams, and hardware so that the React client never talks to MongoDB directly.          | 5      | 2     | SR2, SR5 |




### Research spikes


| ID    | Type     | Item                                                                                                                | Points | Phase |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| RS-01 | Research | Spike: MongoDB schema for `users`, `teams`, and `hardwareSets` (consoles/cartridges: capacity, availability, checked-out-per-team). | 2      | 1     |
| RS-02 | Research | Spike: password hashing library and session/token approach for the Node.js API.                                        | 2      | 1     |
| RS-03 | Research | Spike: how Node.js and Java share MongoDB safely for concurrent checkout.                                              | 3      | 1     |
| RS-04 | Research | Spike: cloud host (Render / Railway / Heroku) for a React + Node + Java deploy.                                        | 2      | 2     |




### Technical debt (tracked early, paid in later sprints)


| ID    | Type      | Item                                                                           | Points | Phase |
| ----- | --------- | -------------------------------------------------------------------------------- | ------ | ----- |
| TD-01 | Tech debt | Add Jest and JUnit smoke tests for login, create team, checkout, and check-in.   | 3      | 2+    |
| TD-02 | Tech debt | GitHub Actions to run tests on every PR.                                         | 2      | 2+    |
| TD-03 | Tech debt | Shared validation for checkout amounts (no negative, no over-capacity).          | 2      | 2     |
| TD-04 | Tech debt | Keep bugs on a separate Issues board from this story board.                      | 1      | 1     |




### Stretch goals (post-MVP, not required for Phase 1 or 2)


| ID    | Type   | Item                                                                                                                                                    | Notes |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| SG-01 | Stretch | Categorize cartridges by rating (kid / teen / adult) and let teams filter/restrict which cartridges members can check out.                              | Requires adding a `category`/`rating` field to every cartridge, an age-range field per user, and a permission check on checkout — meaningfully more schema and logic than the MVP, so it's explicitly deferred. |
| SG-02 | Stretch | Search/filter the catalog by genre or platform.                                                                                                        | Only worth doing after SG-01's categories exist. |


### Suggested Sprint 1 (Phase 1 close-out)

Ready for the board now: **RS-01, RS-02, RS-03, TD-04**, plus creating the GitHub Project and cards for US-01–US-14 (SG-01/SG-02 optional, park in Backlog).

---



## MVP feature checklist

From the course spec. Each line is covered by the stories above.

**User & team management**

- [ ] Sign-in with userid and password (US-02)
- [ ] New User popup to register (US-01)
- [ ] Create team: name, description, teamID (US-04)
- [ ] Join / open an existing team (US-05, US-06)
- [ ] MongoDB for users and teams (US-12, RS-01)
- [ ] API access to stored data (US-14)
- [ ] Encrypted / hashed credentials (US-03)

**Console & cartridge rentals**

- [ ] Display total console/cartridge capacity (US-07)
- [ ] Display current console/cartridge availability (US-08)
- [ ] Hardware stored and read from the database (US-11)
- [ ] Checkout and check-in unit counts (US-09, US-10)

**Stretch (not required for MVP)**

- [ ] Cartridge categories + age-range checkout restriction (SG-01)
- [ ] Catalog search/filter (SG-02)

---



## R1-3 High-level sketch

![High-level architecture sketch](docs/architecture/sketch.svg)

The React client is split into the two panels from the spec (User/Team Management, Console & Cartridge Rentals). It talks to two backend APIs — Node.js for users/teams, Java for console/cartridge checkout/check-in — both reading and writing a shared MongoDB instance (`users`, `teams`, `hardwareSets`). Source file: [`docs/architecture/sketch.svg`](docs/architecture/sketch.svg) (edit directly, or recreate in draw.io if the team prefers).
