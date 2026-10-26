// Thin REST client. Every value shown in the UI comes through these calls (R2-2).
//
// This is the ONLY file that talks to the server. Components call `api.*` and never use `fetch` themselves.
// That is what makes the move from the mock API to Flask + MongoDB a small change: the routes, request
// shapes, and statuses below are the contract in docs/api-roadmap.md (section 2). If Flask follows the
// contract, the components should not need to change.
//
// Roadmap sections that matter here:
//   1  How the frontend connects today (BASE, error format, status codes)
//   2  The routes the backend must match
//   3  Read vs. write calls
//   6  Race conditions on check-out / check-in
//   8  Planned changes to this file
//   12 Switching between the mock and the real backend
import { ApiError, NetworkError } from './errors.ts'
import { markOffline, markOnline, setProbe } from './connection.ts'
import type { NewUserCredentials, ProjectID, Quantity, SignInCredentials } from './validation.ts'

/**
 * A project as the server returns it. In MongoDB this is a `projects` document, and `projectID`
 * is the document's `_id` (roadmap section 4).
 */
export interface Project {
  projectID: string
  name: string
  description: string
}

/**
 * A project plus the userIDs of everyone in it. Returned by /get_project_info.
 * The backend reads `members` straight from the project document (roadmap section 7.2).
 */
export interface ProjectInfo extends Project {
  members: string[]
}

/**
 * One hardware set (HWSet1, HWSet2, ...). In MongoDB this is a `hardwareSets` document.
 * Rule the backend keeps true: capacity = available + units held by all projects (roadmap section 4).
 *
 * TODO (roadmap sections 7.1 and 8): add `checkedOut?: number`. The backend will fill it in when the
 * request names a project. It is how many units that project holds, and it will replace the
 * Number.MAX_SAFE_INTEGER check-in limit in HardwareSetCard.
 */
export interface HardwareSet {
  name: string
  capacity: number
  available: number
}

/** How long we wait for the server before giving up and treating it as offline. */
export const REQUEST_TIMEOUT_MS = 8000

// A proxy or load balancer answers with these when the backend behind it is down (roadmap section 1).
// They switch the status light to offline. Other errors (400, 401, 404, 409) mean the server is up.
const GATEWAY_DOWN = new Set([502, 503, 504])

/**
 * The start of every URL. This is the switch between mock and real backend (roadmap sections 1 and 12):
 *   - VITE_API_URL not set -> '' (same origin). In dev this is the mock API, or Vite's proxy to Flask.
 *   - VITE_API_URL set     -> that address, e.g. http://localhost:5000 or the deployed Flask URL.
 * Nothing else in this file needs to change when we switch.
 */
const BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Sends one request and returns the JSON body. Every route below goes through here.
 *
 * What it does:
 *   - Adds a timeout (REQUEST_TIMEOUT_MS) and JSON headers.
 *   - Tells connection.ts whether the server is reachable (drives the status light and banner).
 *   - Turns failures into our own error types so components do not handle raw responses:
 *       NetworkError - no answer at all (server down, network dropped, timeout)
 *       ApiError     - the server answered with a non-2xx status
 *
 * Backend contract (roadmap section 1): every non-2xx response must have a JSON body like
 * { "error": "<message>" }. The message is shown to the user exactly as written, so it should be
 * readable by a person. If there is no `error` field we fall back to `message`, then to the status code.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...init,
    })
  } catch (err) {
    // fetch only throws when no response came back: server down, network error, or our timeout.
    markOffline()
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new NetworkError('The server took too long to respond. Please try again.')
    }
    throw new NetworkError('Cannot reach the server. Check your connection and try again.')
  }

  // A real answer means the server is up, unless it is a gateway error (backend behind it is down).
  if (GATEWAY_DOWN.has(res.status)) markOffline()
  else markOnline()

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? body.message ?? `HTTP ${res.status}`)
  return body as T
}

/**
 * Sends a POST with a JSON body. Used for every WRITE route, plus /login (roadmap section 3).
 * /login is a POST so the password stays out of the URL and server logs.
 * Do not retry a failed write blindly. Refetch the state first and let the user decide.
 */
const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) })

/**
 * Builds a query string for GET routes, e.g. q({ userID: 'alice' }) gives "?userID=alice".
 * Values are URL-encoded for us.
 */
const q = (params: Record<string, string>) => '?' + new URLSearchParams(params).toString()

/**
 * This type is a project the user is creating: the same fields as Project, but the projectID must have
 * passed validateProjectID(). Project itself stays a plain string ID because it also describes what the
 * server sends back, which never went through the validator.
 */
export type NewProject = Omit<Project, 'projectID'> & {projectID: ProjectID};

/**
 * Every call the app can make to the backend, grouped the same way as the roadmap tables (section 2).
 * Each entry says the route, whether it is a read or a write (section 3), and the errors to expect.
 *
 * The parameter types (SignInCredentials, ProjectID, Quantity, ...) can only be made by the functions in
 * validation.ts. So an unchecked value cannot be passed in; it is a compile error. The backend still
 * repeats every check, because anyone can send requests without using our UI.
 */
export const api = {
  // ---- Users (write) ----

  /**
   * POST /login. Returns { userID }.
   * Errors: 401 "Invalid userID or password". The backend gives the same 401 for an unknown user and a
   * wrong password, so the form cannot be used to find out which userIDs exist (roadmap section 5).
   * No session or token yet: the app just keeps the returned userID in React state (roadmap section 10).
   */
  login: (creds: SignInCredentials) =>
    post<{ userID: string }>('/login', { userID: creds.userID, password: creds.password }),

  /**
   * POST /add_user. Returns { userID }.
   * The plaintext password is sent over HTTPS and only the server hashes it (bcrypt). Errors: 400 for
   * invalid credentials, 409 "User already exists" (roadmap sections 5 and 6).
   */
  addUser: (creds: NewUserCredentials) =>
    post<{ userID: string }>('/add_user', { userID: creds.userID, password: creds.password }),

  // ---- Projects ----

  /**
   * GET /get_user_projects_list?userID=  (read). Lists the projects this user belongs to.
   * An empty list is not an error. The UI shows "You are not part of any project yet."
   *
   * TODO (roadmap sections 2 and 8): the backend will return a MAP keyed by projectID instead of an array:
   *   { projects: { [projectID]: Project } }
   * When that lands, change the type to Record<string, Project> and have ProjectsView use
   * Object.values(res.projects ?? {}). The mock must change at the same time.
   */
  getUserProjects: (userID: string) =>
    request<{ projects: Project[] }>('/get_user_projects_list' + q({ userID })),

  /**
   * GET /get_project_info?projectID=  (read). Returns the project's details and members.
   * Errors: 404 if the project does not exist.
   */
  getProjectInfo: (projectID: string) =>
    request<ProjectInfo>('/get_project_info' + q({ projectID })),

  /**
   * POST /create_project  (write). Returns the new Project. The creator is added as a member
   * by the server in the same request.
   * Errors: 400 invalid ID, 409 ID already taken (roadmap section 6: the database's unique `_id` decides).
   */
  createProject: (userID: string, project: NewProject) =>
    post<Project>('/create_project', { userID, ...project }),

  /**
   * POST /join_project  (write). Adds the user to an existing project and returns it.
   * Errors: 404 no such project, 409 "You are already part of this project".
   * ProjectsView catches that 409 and opens the project anyway, so the backend must keep returning 409
   * for existing members (roadmap section 2).
   */
  joinProject: (userID: string, projectID: ProjectID) =>
    post<Project>('/join_project', { userID, projectID }),

  // ---- Hardware ----

  /**
   * GET /get_all_hw_names  (read). Returns { names: ['HWSet1', 'HWSet2', ...] }.
   * The Hardware page builds its cards from this list, so no set names are hard-coded (R2-2).
   * This is also the "is the server back?" check that connection.ts runs every 5 seconds while offline
   * (see setProbe at the bottom). The backend must keep it cheap and open to everyone, with no login
   * needed (roadmap section 1).
   */
  getHardwareNames: () => request<{ names: string[] }>('/get_all_hw_names'),

  /**
   * GET /get_hw_info?name=  (read). Returns one set's { name, capacity, available }. Errors: 404.
   *
   * TODO (roadmap sections 7.1 and 8): add an optional `projectID` parameter. When it is given, the
   * backend also returns `checkedOut` (units that project holds). ResourcesView will pass it.
   */
  getHardwareInfo: (name: string) => request<HardwareSet>('/get_hw_info' + q({ name })),

  /**
   * POST /check_out  (write). Takes `quantity` units from the shared pool for a project and returns
   * the updated HardwareSet.
   * Errors: 400 bad quantity, 404 unknown project or set, 409 not enough units available.
   * A 409 means someone else got there first. HardwareSetCard refetches the numbers when it sees one.
   * This is a critical section, so the backend must do the availability check inside one atomic
   * database update (roadmap section 6).
   * `quantity` goes out as a plain JSON integer. Quantity has already been validated, and the server
   * rejects strings, decimals, booleans, and anything <= 0.
   */
  checkOut: (projectID: string, hwSet: string, quantity: Quantity) =>
    post<HardwareSet>('/check_out', { projectID, hwSet, quantity }),

  /**
   * POST /check_in  (write). Returns `quantity` units from a project to the shared pool and returns
   * the updated HardwareSet.
   * Errors: 400 bad quantity, 404 unknown project or set, 409 the project holds fewer units than asked.
   * Right now only the server enforces the "project holds enough" limit. Once `checkedOut` exists
   * (see getHardwareInfo above), the frontend can check it too.
   * Same critical-section rules as check-out (roadmap section 6).
   */
  checkIn: (projectID: string, hwSet: string, quantity: Quantity) =>
    post<HardwareSet>('/check_in', { projectID, hwSet, quantity }),
}

// While offline, connection.ts retries this cheap read-only call to detect when the server is back.
setProbe(api.getHardwareNames)
