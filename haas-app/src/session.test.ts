import { afterEach, describe, expect, it, vi } from 'vitest'
import { clear, clearActivity, enqueue, getActivity, loadNav, pendingKeys, recordActivity, saveNav, subscribeActivity } from './session.ts'

/** A promise plus the functions that settle it, so a test decides when each request finishes. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

afterEach(() => clear())

describe('enqueue', () => {
  it('runs requests with the same key one at a time, in order', async () => {
    const log: string[] = []
    const first = deferred<string>()
    const a = enqueue('p:HW1', () => { log.push('a start'); return first.promise })
    const b = enqueue('p:HW1', async () => { log.push('b start'); return 'b' })

    await Promise.resolve()
    expect(log).toEqual(['a start'])
    first.resolve('a')
    await expect(a).resolves.toBe('a')
    await expect(b).resolves.toBe('b')
    expect(log).toEqual(['a start', 'b start'])
  })

  it('does not make different keys wait for each other', async () => {
    const blocked = deferred<string>()
    enqueue('p:HW1', () => blocked.promise)
    await expect(enqueue('p:HW2', async () => 'other')).resolves.toBe('other')
    blocked.resolve('done')
  })

  it('keeps going after a failed request', async () => {
    const failed = enqueue('p:HW1', async () => { throw new Error('409') })
    const next = enqueue('p:HW1', async () => 'ok')
    await expect(failed).rejects.toThrow('409')
    await expect(next).resolves.toBe('ok')
  })

  it('removes a key once its requests have settled', async () => {
    await enqueue('p:HW1', async () => 'ok')
    await Promise.resolve()
    expect(pendingKeys()).toBe(0)
  })
})

describe('clear', () => {
  it('empties the queue and cancels requests that had not started', async () => {
    const first = deferred<string>()
    let secondRan = false
    const a = enqueue('p:HW1', () => first.promise)
    const b = enqueue('p:HW1', async () => { secondRan = true; return 'b' })

    await Promise.resolve() // let the first request start
    clear()
    expect(pendingKeys()).toBe(0)
    first.resolve('a')
    await expect(a).resolves.toBe('a')
    await expect(b).rejects.toThrow('signed out')
    expect(secondRan).toBe(false)
  })
})

describe('saveNav / loadNav', () => {
  /** A minimal in-memory stand-in: vitest runs in node, which has no sessionStorage. */
  const fakeStorage = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
  }
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips the user and project', () => {
    vi.stubGlobal('sessionStorage', fakeStorage())
    saveNav({ userID: 'alice', projectID: 'PROJ0042' })
    expect(loadNav()).toEqual({ userID: 'alice', projectID: 'PROJ0042' })
  })

  it('clear() forgets it, so a refresh after sign-out shows Sign In', () => {
    vi.stubGlobal('sessionStorage', fakeStorage())
    saveNav({ userID: 'alice', projectID: null })
    clear()
    expect(loadNav()).toEqual({ userID: null, projectID: null })
  })

  it('ignores a project that has no user, and malformed data', () => {
    const s = fakeStorage()
    vi.stubGlobal('sessionStorage', s)
    saveNav({ userID: null, projectID: 'PROJ0042' })
    expect(loadNav()).toEqual({ userID: null, projectID: null })
    s.setItem('haas.nav', '{not json')
    expect(loadNav()).toEqual({ userID: null, projectID: null })
  })

  it('works without storage: nothing throws and the user is signed out', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    vi.stubGlobal('sessionStorage', broken)
    expect(() => saveNav({ userID: 'alice', projectID: null })).not.toThrow()
    expect(loadNav()).toEqual({ userID: null, projectID: null })
    expect(() => clear()).not.toThrow()
  })
})

describe('activity log', () => {
  const entry = (n: number, projectID = 'PROJ0001') =>
    ({ time: new Date(n), projectID, hwSet: 'HWSet1', kind: 'out' as const, quantity: n })

  it('returns entries newest first', () => {
    recordActivity(entry(1))
    recordActivity(entry(2))
    expect(getActivity('PROJ0001').map((a) => a.quantity)).toEqual([2, 1])
  })

  it('only returns the entries of the project asked for', () => {
    recordActivity(entry(1, 'PROJ0001'))
    recordActivity(entry(2, 'PROJ0002'))
    expect(getActivity('PROJ0002').map((a) => a.quantity)).toEqual([2])
  })

  it('keeps only the newest 50', () => {
    for (let i = 1; i <= 55; i++) recordActivity(entry(i))
    const list = getActivity('PROJ0001')
    expect(list).toHaveLength(50)
    expect(list[0].quantity).toBe(55)
    expect(list[49].quantity).toBe(6)
  })

  it('clearActivity(projectID) drops only that project, and clearActivity() drops everything', () => {
    recordActivity(entry(1, 'PROJ0001'))
    recordActivity(entry(2, 'PROJ0002'))
    clearActivity('PROJ0001')
    expect(getActivity('PROJ0001')).toEqual([])
    expect(getActivity('PROJ0002')).toHaveLength(1)
    clearActivity()
    expect(getActivity('PROJ0002')).toEqual([])
  })

  it('clear() wipes it, and subscribers hear about both changes', () => {
    let calls = 0
    const stop = subscribeActivity(() => calls++)
    recordActivity(entry(1))
    clear()
    stop()
    recordActivity(entry(2))
    expect(calls).toBe(2)
    expect(getActivity('PROJ0001').map((a) => a.quantity)).toEqual([2])
  })
})
