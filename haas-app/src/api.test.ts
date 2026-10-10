import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.ts'
import { ApiError, NetworkError } from './errors.ts'
import { getConnectionStatus, markOnline, PROBE_INTERVAL_MS } from './connection.ts'
import { Integer } from './math.ts'

const fetchMock = vi.fn()

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  markOnline()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('api requests', () => {
  it('returns the JSON body on success', async () => {
    fetchMock.mockReturnValueOnce(reply(200, { userID: 'testuser' }))
    await expect(api.login('testuser', 'test1234')).resolves.toEqual({ userID: 'testuser' })
    expect(fetchMock).toHaveBeenCalledWith('/login', expect.objectContaining({ method: 'POST' }))
  })

  it('throws an ApiError carrying the status and the server message', async () => {
    fetchMock.mockReturnValueOnce(reply(409, { error: 'Only 3 units of HWSet1 available' }))
    const err = await api.checkOut('demoproj1', 'HWSet1', Integer.of(5)).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.isConflict()).toBe(true)
    expect(err.message).toBe('Only 3 units of HWSet1 available')
    expect(getConnectionStatus()).toBe('online')
  })
})

describe('network failures', () => {
  it('throws a NetworkError and goes offline when the server cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const err = await api.getHardwareNames().catch((e) => e)
    expect(err).toBeInstanceOf(NetworkError)
    expect(err.message).toMatch(/Cannot reach the server/)
    expect(getConnectionStatus()).toBe('offline')
  })

  it('reports a timeout separately', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
    const err = await api.getHardwareNames().catch((e) => e)
    expect(err).toBeInstanceOf(NetworkError)
    expect(err.message).toMatch(/too long/)
  })

  it('treats a 503 from a gateway as offline but still throws an ApiError', async () => {
    fetchMock.mockReturnValueOnce(reply(503, {}))
    const err = await api.getHardwareNames().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.isServer()).toBe(true)
    expect(getConnectionStatus()).toBe('offline')
  })

  it('probes while offline and comes back online once the server answers', async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await api.getHardwareNames().catch(() => {})
    expect(getConnectionStatus()).toBe('offline')

    fetchMock.mockReturnValueOnce(reply(200, { names: ['HWSet1'] }))
    await vi.advanceTimersByTimeAsync(PROBE_INTERVAL_MS)
    expect(getConnectionStatus()).toBe('online')

    // Probing stops once the server is back.
    await vi.advanceTimersByTimeAsync(PROBE_INTERVAL_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
