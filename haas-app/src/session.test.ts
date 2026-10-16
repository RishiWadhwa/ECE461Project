import { afterEach, describe, expect, it } from 'vitest'
import { clear, enqueue, pendingKeys } from './session.ts'

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
