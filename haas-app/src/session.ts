import { AppError } from './errors.ts'

// Session-only request queue. Holds requests that are in flight or waiting, never totals: the
// database is the only record of what each project has checked out.

/**
 * This hashtable maps a key (e.g. "demoproj1:HWSet1") to the last request queued under it. Each new request
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
}

/**
 * This function counts the keys that still have requests in flight or waiting.
 * @returns This function returns the number of keys in the queue.
 */
export function pendingKeys(): number {
  return queue.size
}
