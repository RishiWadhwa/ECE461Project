// REST client. Every value shown in the UI comes through these calls (R2-2).
//
// This is the ONLY file that talks to the server. Components call `api.*` and never use `fetch` themselves.
// `api` is an ApiClient (roadmap section 12):
//   ApiClient      - abstract base class. Owns every route, the error mapping, and the status light.
//                    Subclasses only supply send(): "deliver one request, return status + body".
//   HttpApiClient  - send() uses fetch against a base URL.
// createApi() reads the Vite mode once and picks the base URL:
//   npm run dev       -> '' (same origin), answered by the mock middleware in mock-api.ts
//   npm run dev:prod  -> Flask at http://localhost:5000
// so there is no mock/real switch anywhere else in the frontend.
// The routes, request shapes, and statuses below are the contract in docs/api-roadmap.md (section 2).
//
// Roadmap sections that matter here:
//   1  How the frontend connects today (error format, status codes)
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

/**
 * This type is a project the user is creating: the same fields as Project, but the projectID must have
 * passed validateProjectID(). Project itself stays a plain string ID because it also describes what the
 * server sends back, which never went through the validator.
 */
export type NewProject = Omit<Project, 'projectID'> & {projectID: ProjectID};

/** How long we wait for the server before giving up and treating it as offline. */
export const REQUEST_TIMEOUT_MS = 8000

// A proxy or load balancer answers with these when the backend behind it is down (roadmap section 1).
// They switch the status light to offline. Other errors (400, 401, 403, 404, 409) mean the server is up.
const GATEWAY_DOWN = new Set([502, 503, 504])

const CANNOT_REACH = 'Cannot reach the server. Check your connection and try again.'

type Method = 'GET' | 'POST'

/** What send() hands back: the HTTP status and the parsed JSON body ({} if there was none). */
export interface RawResponse {
  status: number
  body: unknown
}

/**
 * Every call the app can make to the backend, grouped the same way as the roadmap tables (section 2).
 * Each entry says the route, whether it is a read or a write (section 3), and the errors to expect.
 *
 * The parameter types (SignInCredentials, ProjectID, Quantity, ...) can only be made by the functions in
 * validation.ts. So an unchecked value cannot be passed in; it is a compile error. The backend still
 * repeats every check, because anyone can send requests without using our UI.
 *
 * The routes are arrow-function fields, not methods, so `this` stays bound when a component passes one
 * around on its own (HardwareSetCard does `const call = api.checkOut`).
 */
export abstract class ApiClient {
  /**
   * Delivers one request and returns the status and JSON body. The only thing a subclass decides.
   * Throws NetworkError when no answer came back at all; never throws for a non-2xx status.
   */
  protected abstract send(method: Method, path: string, query: Record<string, string>, body?: unknown): Promise<RawResponse>

  constructor() {
    // While offline, connection.ts retries this cheap read-only call to detect when the server is back.
    // The app only ever makes one client (createApi), so the newest client owns the probe.
    setProbe(this.getHardwareNames)
  }

  /**
   * Sends one request through send() and returns the JSON body. Every route below goes through here.
   *
   * What it does:
   *   - Tells connection.ts whether the server is reachable (drives the status light and banner).
   *   - Turns failures into our own error types so components do not handle raw responses:
   *       NetworkError - no answer at all (thrown by send())
   *       ApiError     - the server answered with a non-2xx status
   *
   * Backend contract (roadmap section 1): every non-2xx response must have a JSON body like
   * { "error": "<message>" }. The message is shown to the user exactly as written, so it should be
   * readable by a person. If there is no `error` field we fall back to `message`, then to the status code.
   */
  private async request<T>(method: Method, path: string, query: Record<string, string>, body?: unknown): Promise<T> {
    let res: RawResponse
    try {
      res = await this.send(method, path, query, body)
    } catch (err) {
      if (err instanceof NetworkError) markOffline()
      throw err
    }

    // A real answer means the server is up, unless it is a gateway error (backend behind it is down).
    if (GATEWAY_DOWN.has(res.status)) markOffline()
    else markOnline()

    const b = (res.body ?? {}) as { error?: string; message?: string }
    if (res.status < 200 || res.status >= 300) throw new ApiError(res.status, b.error ?? b.message ?? `HTTP ${res.status}`)
    return res.body as T
  }

  /** GET with query parameters, e.g. get('/x', { userID: 'alice' }) requests "/x?userID=alice". */
  private get<T>(path: string, query: Record<string, string> = {}) {
    return this.request<T>('GET', path, query)
  }

  /**
   * POST with a JSON body. Used for every WRITE route, plus /login (roadmap section 3).
   * /login is a POST so the password stays out of the URL and server logs.
   * Do not retry a failed write blindly. Refetch the state first and let the user decide.
   */
  private post<T>(path: string, data: unknown) {
    return this.request<T>('POST', path, {}, data)
  }

  // ---- Users (write) ----

  /**
   * POST /login. Returns { userID }.
   * Errors: 401 "Invalid userID or password". The backend gives the same 401 for an unknown user and a
   * wrong password, so the form cannot be used to find out which userIDs exist (roadmap section 5).
   * No session or token yet: the app just keeps the returned userID in React state (roadmap section 10).
   */
  login = (creds: SignInCredentials) =>
    this.post<{ userID: string }>('/login', { userID: creds.userID, password: creds.password })

  /**
   * POST /add_user. Returns { userID }.
   * The plaintext password is sent over HTTPS and only the server hashes it. Errors: 400 for
   * invalid credentials, 409 "User already exists" (roadmap sections 5 and 6).
   */
  addUser = (creds: NewUserCredentials) =>
    this.post<{ userID: string }>('/add_user', { userID: creds.userID, password: creds.password })

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
  getUserProjects = (userID: string) =>
    this.get<{ projects: Project[] }>('/get_user_projects_list', { userID })

  /**
   * GET /get_project_info?projectID=  (read). Returns the project's details and members.
   * Errors: 404 if the project does not exist.
   */
  getProjectInfo = (projectID: string) =>
    this.get<ProjectInfo>('/get_project_info', { projectID })

  /**
   * POST /create_project  (write). Returns the new Project. The creator is added as a member
   * by the server in the same request.
   * Errors: 400 invalid ID, 409 ID already taken (roadmap section 6: the database's unique `_id` decides).
   */
  createProject = (userID: string, project: NewProject) =>
    this.post<Project>('/create_project', { userID, ...project })

  /**
   * POST /join_project  (write). Adds the user to an existing project and returns it.
   * Errors: 404 no such project, 409 "You are already part of this project".
   * ProjectsView catches that 409 and opens the project anyway, so the backend must keep returning 409
   * for existing members (roadmap section 2).
   */
  joinProject = (userID: string, projectID: ProjectID) =>
    this.post<Project>('/join_project', { userID, projectID })

  // ---- Hardware ----

  /**
   * GET /get_all_hw_names  (read). Returns { names: ['HWSet1', 'HWSet2', ...] }.
   * The Hardware page builds its cards from this list, so no set names are hard-coded (R2-2).
   * This is also the "is the server back?" check that connection.ts runs every 5 seconds while offline
   * (see setProbe in the constructor). The backend must keep it cheap and open to everyone, with no login
   * needed (roadmap section 1).
   */
  getHardwareNames = () => this.get<{ names: string[] }>('/get_all_hw_names')

  /**
   * GET /get_hw_info?name=  (read). Returns one set's { name, capacity, available }. Errors: 404.
   *
   * TODO (roadmap sections 7.1 and 8): add an optional `projectID` parameter. When it is given, the
   * backend also returns `checkedOut` (units that project holds). ResourcesView will pass it.
   */
  getHardwareInfo = (name: string) => this.get<HardwareSet>('/get_hw_info', { name })

  /**
   * POST /check_out  (write). Takes `quantity` units from the shared pool for a project and returns
   * the updated HardwareSet.
   * Errors: 400 bad quantity, 403 not a member, 404 unknown project or set, 409 not enough units available.
   * A 409 means someone else got there first. HardwareSetCard refetches the numbers when it sees one.
   * This is a critical section, so the backend must do the availability check inside one atomic
   * database update (roadmap section 6).
   * `quantity` goes out as a plain JSON integer (Integer.toJSON). Quantity has already been validated, and
   * the server rejects strings, decimals, booleans, and anything <= 0.
   */
  checkOut = (userID: string, projectID: string, hwSet: string, quantity: Quantity) =>
    this.post<HardwareSet>('/check_out', { userID, projectID, hwSet, quantity })

  /**
   * POST /check_in  (write). Returns `quantity` units from a project to the shared pool and returns
   * the updated HardwareSet.
   * Errors: 400 bad quantity, 403 not a member, 404 unknown project or set, 409 the project holds fewer
   * units than asked.
   * Right now only the server enforces the "project holds enough" limit. Once `checkedOut` exists
   * (see getHardwareInfo above), the frontend can check it too.
   * Same critical-section rules as check-out (roadmap section 6).
   */
  checkIn = (userID: string, projectID: string, hwSet: string, quantity: Quantity) =>
    this.post<HardwareSet>('/check_in', { userID, projectID, hwSet, quantity })
}

/**
 * Talks to the Flask backend over HTTP. `base` is the start of every URL: '' for same origin, or e.g.
 * 'http://localhost:5000'. Adds JSON headers and a REQUEST_TIMEOUT_MS timeout.
 */
export class HttpApiClient extends ApiClient {
  private readonly base: string

  constructor(base: string) {
    super()
    this.base = base
  }

  protected async send(method: Method, path: string, query: Record<string, string>, body?: unknown): Promise<RawResponse> {
    const qs = new URLSearchParams(query).toString()
    let res: Response
    try {
      res = await fetch(`${this.base}${path}${qs ? '?' + qs : ''}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (err) {
      // fetch only throws when no response came back: server down, network error, or our timeout.
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new NetworkError('The server took too long to respond. Please try again.')
      }
      throw new NetworkError(CANNOT_REACH)
    }
    return { status: res.status, body: await res.json().catch(() => ({})) }
  }
}

/**
 * Picks the base URL from the Vite mode (roadmap section 12). This is the only mock/real decision in the
 * frontend; vite.config.ts turns the mock middleware on or off with the same mode.
 *   npm run dev, npm test  -> '' (same origin). In dev the mock middleware answers; tests stub fetch.
 *   npm run dev:prod       -> VITE_API_URL, or Flask at http://localhost:5000
 *   npm run build          -> VITE_API_URL, or the same origin if it is unset
 *
 * DEV DATABASE (on hold, see docs/api-roadmap.md section 11): which MongoDB database dev:prod writes to is decided
 * by Flask's MONGO_DB, not here. If the team adds a `haas_dev` database, nothing in this file changes.
 */
export function createApi(): ApiClient {
  const fallback = import.meta.env.MODE === 'prod' ? 'http://localhost:5000' : ''
  return new HttpApiClient(import.meta.env.VITE_API_URL ?? fallback)
}

export const api = createApi()
