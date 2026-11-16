import { AppError } from './errors.ts'

// Session-only request queue. Holds requests that are in flight or waiting, never totals: the
// database is the only record of what each project has checked out.

/**
 * This hashtable maps a key (e.g. "PROJ0001:HWSet1") to the last request queued under it. Each new request
 * waits for that one to settle first, so requests for the same key run one at a time, in order.
 */
const queue = new Map<string, Promise<unknown>>()

/**
 * This counter goes up on every clear(), so requests queued before a sign-out know not to run.
 */
let generation = 0

/**
 * This function runs a request after every earlier request with the same key has settled.
 * A failed request does not block the ones after it.
 * @param key This parameter is what requests are grouped by, e.g. `${projectID}:${hwSetName}`.
 * @param request This parameter starts the request, e.g. () => api.checkOut(...).
 * @returns This function returns the request's own result or error.
 */
export function enqueue<T>(key: string, request: () => Promise<T>): Promise<T> {
  const gen = generation
  const run = (queue.get(key) ?? Promise.resolve()).then(() => {
    if (gen !== generation) throw new AppError('You signed out before this request was sent.')
    return request()
  })
  const settled = run.catch(() => undefined)
  queue.set(key, settled)
  // Drop the entry once nothing newer is queued behind it, so an idle session holds nothing.
  settled.then(() => {
    if (queue.get(key) === settled) queue.delete(key)
  })
  return run
}

/**
 * This function wipes the queue on sign-out. Requests already sent still finish, but anything still
 * waiting is cancelled, and nothing about the user or project stays in memory.
 */
export function clear(): void {
  generation++
  queue.clear()
  clearNav()
}

// Where the user is, kept in sessionStorage so a page refresh does not sign them out. Only the userID and
// projectID are stored, never a password or hardware totals. There is no session token yet (roadmap section 10),
// so this is a convenience, not authentication. sessionStorage is per tab and gone when the tab closes.
const NAV_KEY = 'haas.nav'

export interface Nav {
  userID: string | null
  projectID: string | null
}

/** Saves where the user is. Storage can throw (private window, blocked site data); the app then just forgets on refresh. */
export function saveNav(nav: Nav): void {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(nav))
  } catch { /* shortcut: no fallback store, refresh signs out again */ }
}

/** Reads what saveNav stored. Anything missing, malformed, or unreadable means signed out. */
export function loadNav(): Nav {
  try {
    const raw = JSON.parse(sessionStorage.getItem(NAV_KEY) ?? 'null')
    const userID = typeof raw?.userID === 'string' && raw.userID ? raw.userID : null
    // A project without a user would skip Sign In, so it only counts alongside a userID.
    const projectID = userID && typeof raw.projectID === 'string' && raw.projectID ? raw.projectID : null
    return { userID, projectID }
  } catch {
    return { userID: null, projectID: null }
  }
}

function clearNav(): void {
  try {
    sessionStorage.removeItem(NAV_KEY)
  } catch { /* nothing stored that we can reach */ }
}

/**
 * This function counts the keys that still have requests in flight or waiting.
 * @returns This function returns the number of keys in the queue.
 */
export function pendingKeys(): number {
  return queue.size
}
