# ECE 461 HaaS Proof of Concept

Hardware-as-a-Service (HaaS) web application inspired by the University of Utah [POWDER](https://powderwireless.net/) program. The app lets users create accounts and projects, view hardware capacity and availability, and check out / check in shared hardware resources.

This repository is the single deliverable repo for all project phases.

---

## Phase 1 Deliverables

| ID | Requirement | Status |
| --- | --- | --- |
| R1-1 | Project plan (team, sprints, collaboration, methodology, toolchain) | In this README |
| R1-2 | All features on a board, with initial work items | [User stories](#r1-2-features-and-work-items) below; copy onto the GitHub Project board |
| R1-3 | High-level application sketch | Deferred |
| R1-4 | Choice of tools and approach | [Toolchain](#toolchain-and-approach) |

---

## R1-1 Project Plan

### Team

| Name | Role | GitHub |
| --- | --- | --- |
| Rishi Wadhwa | Frontend / integration | [RishiWadhwa](https://github.com/RishiWadhwa) |
| _Teammate 2_ | Backend (Java) | _TBD_ |
| _Teammate 3_ | Backend (Node.js) | _TBD_ |
| _Teammate 4_ | Database / APIs | _TBD_ |
| _Teammate 5_ | Testing / DevOps | _TBD_ |

Roles are a starting split, not hard ownership. Work is assigned per sprint from the board.

### Implementation methodology

We are using **Agile Scrum**:

- Work is planned as user stories, research spikes, and technical-debt items.
- Each story is small enough for one person or a pair, written in three sentences or less, and mapped to a stakeholder need.
- GitHub **Projects** holds user stories. GitHub **Issues** holds bugs and improvements. Those are kept on separate boards, per course guidance.
- Changes land through pull requests into `dev`, then `main` for phase submissions.

### Sprint cadence and velocity

| Item | Plan |
| --- | --- |
| Sprint length | 1 week |
| Sprint planning | Monday, ~30 min (Zoom) |
| Standups | 3x / week, 10 min (Slack huddle or Zoom) |
| Review + retro | Friday, ~20 min |
| Initial velocity | Unknown; we will measure completed story points after Sprint 1 and use that as the forecast |
| Estimation | Fibonacci story points (1, 2, 3, 5, 8) |

Phase-level targets:

| Phase | Goal |
| --- | --- |
| Phase 1 | Plan, board, toolchain |
| Phase 2 | Hardware and user/project data in MongoDB, APIs used by the app (no hard-coded page data), cloud URL for TAs |

### Collaboration tools

| Tool | Use |
| --- | --- |
| GitHub | Source control, PRs, code review |
| GitHub Projects | User-story board (Backlog → Ready → In Progress → Review → Done) |
| GitHub Issues | Bugs and improvements only (separate from the story board) |
| Slack | Daily chat, standup notes, blockers |
| Zoom | Planning, reviews, pairing |
| VS Code / Cursor | Development |

### Branching

- `main` — phase deliverables
- `dev` — integration branch (current working branch)
- `feature/<short-name>` — one story or spike per branch

---

## Toolchain and Approach

Chosen stack (discussed with the team; not the Python/Flask default from the [AppDev template](https://github.com/ashwin-ram03/AppDevProjectTemplate)):

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React | Course-recommended UI; component model fits login, projects, and hardware panels |
| Backend | Node.js (JavaScript) **and** Java | JS for auth/session and React-friendly JSON APIs; Java for hardware checkout rules and concurrent resource updates |
| Database | MongoDB | Course-recommended; document model fits users, projects, and hardware sets |
| API style | REST over HTTP | Matches the template’s route split (`/login`, `/create_project`, `/check_out`, `/check_in`, …) |
| Auth | Hashed passwords (bcrypt or equivalent); no plaintext credentials | SR3 / SN1 |
| Testing | Jest (JS), JUnit (Java) | Unit tests around login, project membership, and checkout math |
| Hosting (Phase 2) | Cloud URL (Render, Railway, or Heroku) | R2-3: TAs must open the app in a browser |
| CI | GitHub Actions (Phase 2) | Lint + tests on PRs |

### Planned service split

```
React client
    ├── Node.js API     users, login, projects
    └── Java API        hardware sets, checkout, check-in
            └── MongoDB (users, projects, hardwareSets)
```

Template-aligned API surface we will implement:

| Area | Endpoints |
| --- | --- |
| Users | `/login`, `/add_user`, `/get_user_projects_list`, `/join_project` |
| Projects | `/create_project`, `/get_project_info` |
| Hardware | `/get_all_hw_names`, `/get_hw_info`, `/check_out`, `/check_in`, `/create_hardware_set` |

### Planned repo layout

```
client/          React app
server-js/       Node.js user + project API
server-java/     Java hardware API
README.md
```

---

## Stakeholder needs and system requirements

| ID | Need / requirement |
| --- | --- |
| SN0 | Accepted quality and reliability metrics |
| SN1 | Secure user accounts and projects |
| SN2 | View status of all hardware resources |
| SN3 | Request available hardware |
| SN4 | Checkout and manage resources |
| SN5 | Check-in resources and refresh hardware status |
| SN6 | Deliver PoC on schedule, with room to scale |
| SR1 | Delivered within schedule, with periodic stakeholder updates |
| SR2 | Front-end for inputs and outputs |
| SR3 | Encrypted user-id and password |
| SR4 | Create new projects or access existing ones |
| SR5 | Database for users, project codes, project details, and resources |

---

## R1-2 Features and Work Items

Create a **GitHub Project** named `HaaS User Stories` with columns **Backlog**, **Ready**, **In Progress**, **Review**, and **Done**. Add each item below as a card. Do **not** mix bugs onto this board.

Labels: `user-story`, `research`, `tech-debt`, `phase-1`, `phase-2`.

### Feature 1 — User management

| ID | Type | Story | Points | Phase | Maps to |
| --- | --- | --- | --- | --- | --- |
| US-01 | User story | As a new user, I want a New User popup on the sign-in screen so that I can create a userid and password without leaving the page. | 3 | 2 | SN1, SR2, SR4 |
| US-02 | User story | As a registered user, I want to sign in with my userid and password so that I can reach my projects. | 3 | 2 | SN1, SR2 |
| US-03 | User story | As a user, I want my password stored hashed (never plaintext) so that my account stays secure if the database is exposed. | 5 | 2 | SN1, SR3 |
| US-04 | User story | As a signed-in user, I want to create a project with name, description, and projectID so that hardware usage is tracked per project. | 3 | 2 | SN1, SR4, SR5 |
| US-05 | User story | As a signed-in user, I want to join an existing project by projectID so that I can share hardware with my team. | 3 | 2 | SN1, SR4 |
| US-06 | User story | As a signed-in user, I want to see the projects I belong to so that I can pick one before checking out hardware. | 2 | 2 | SN1, SR2, SR5 |

### Feature 2 — Resource management

| ID | Type | Story | Points | Phase | Maps to |
| --- | --- | --- | --- | --- | --- |
| US-07 | User story | As a project member, I want to see capacity of HWSet1 and HWSet2 so that I know the total pool size. | 2 | 2 | SN2, SR2, SR5 |
| US-08 | User story | As a project member, I want to see current availability of HWSet1 and HWSet2 so that I know what I can request. | 2 | 2 | SN2, SN3, SR5 |
| US-09 | User story | As a project member, I want to enter how many units to check out from a hardware set so that my project can reserve them. | 5 | 2 | SN3, SN4 |
| US-10 | User story | As a project member, I want to check in units my project holds so that they return to the shared pool. | 5 | 2 | SN4, SN5 |
| US-11 | User story | As a project member, I want checkout and check-in to persist in the database so that every user sees the same availability. | 5 | 2 | SN2, SN5, SR5 |
| US-12 | User story | As a user of the app, I want all user, project, and hardware data loaded from APIs (no hard-coded page data) so that the UI reflects the live system. | 3 | 2 | SN0, SR2, SR5 |

### Feature 3 — Platform and delivery

| ID | Type | Story | Points | Phase | Maps to |
| --- | --- | --- | --- | --- | --- |
| US-13 | User story | As a TA, I want the PoC hosted at a public URL so that I can grade the running app. | 5 | 2 | SN6, SR1 |
| US-14 | User story | As a developer, I want REST endpoints for users, projects, and hardware so that the React client never talks to MongoDB directly. | 5 | 2 | SR2, SR5 |

### Research spikes

| ID | Type | Item | Points | Phase |
| --- | --- | --- | --- | --- |
| RS-01 | Research | Spike: MongoDB schema for `users`, `projects`, and `hardwareSets` (capacity, availability, checked-out-per-project). | 2 | 1 |
| RS-02 | Research | Spike: password hashing library and session/token approach for the Node.js API. | 2 | 1 |
| RS-03 | Research | Spike: how Node.js and Java share MongoDB safely for concurrent checkout. | 3 | 1 |
| RS-04 | Research | Spike: cloud host (Render / Railway / Heroku) for a React + Node + Java deploy. | 2 | 2 |

### Technical debt (tracked early, paid in later sprints)

| ID | Type | Item | Points | Phase |
| --- | --- | --- | --- | --- |
| TD-01 | Tech debt | Add Jest and JUnit smoke tests for login, create project, checkout, and check-in. | 3 | 2+ |
| TD-02 | Tech debt | GitHub Actions to run tests on every PR. | 2 | 2+ |
| TD-03 | Tech debt | Shared validation for checkout amounts (no negative, no over-capacity). | 2 | 2 |
| TD-04 | Tech debt | Keep bugs on a separate Issues board from this story board. | 1 | 1 |

### Suggested Sprint 1 (Phase 1 close-out)

Ready for the board now: **RS-01, RS-02, RS-03, TD-04**, plus creating the GitHub Project and cards for US-01–US-14.

---

## MVP feature checklist

From the course spec. Each line is covered by the stories above.

**User management**

- [ ] Sign-in with userid and password (US-02)
- [ ] New User popup to register (US-01)
- [ ] Create project: name, description, projectID (US-04)
- [ ] Join / open an existing project (US-05, US-06)
- [ ] MongoDB for users and projects (US-12, RS-01)
- [ ] API access to stored data (US-14)
- [ ] Encrypted / hashed credentials (US-03)

**Resource management**

- [ ] Display HWSet1 and HWSet2 capacity (US-07)
- [ ] Display HWSet1 and HWSet2 availability (US-08)
- [ ] Hardware stored and read from the database (US-11)
- [ ] Checkout and check-in unit counts (US-09, US-10)

---

## R1-3 High-level sketch

Not included in this revision. Will be added as a draw.io / PNG under `docs/architecture` and linked here.
