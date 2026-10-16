import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.ts'
import { ApiError, NetworkError } from './errors.ts'
import { getConnectionStatus, markOnline, PROBE_INTERVAL_MS } from './connection.ts'
import { Integer } from './math.ts'
import { validateCreds, validateProjectID, validateQuantity } from './validation.ts'

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
    await expect(api.login(validateCreds('testuser', 'test1234', 'signIn'))).resolves.toEqual({ userID: 'testuser' })
    expect(fetchMock).toHaveBeenCalledWith('/login', expect.objectContaining({ method: 'POST' }))
  })

  it('sends validated values as plain JSON', async () => {
    fetchMock.mockReturnValue(reply(200, {}))
    await api.login(validateCreds('testuser', 'test1234', 'signIn'))
    await api.checkOut('demoproj1', 'HWSet1', validateQuantity(Integer.of(5), Integer.of(10)))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ userID: 'testuser', password: 'test1234' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ projectID: 'demoproj1', hwSet: 'HWSet1', quantity: 5 })
  })

  it('throws an ApiError carrying the status and the server message', async () => {
    fetchMock.mockReturnValueOnce(reply(409, { error: 'Only 3 units of HWSet1 available' }))
    const err = await api.checkOut('demoproj1', 'HWSet1', validateQuantity(Integer.of(5), Integer.of(10))).catch((e) => e)
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

// These checks run at compile time (npm run build), not in vitest. Each @ts-expect-error fails the build
// if the line below it ever compiles, i.e. if an API call starts accepting an unvalidated value.
// The arrow functions are never called, so no request is sent.
describe('API calls only accept validated values', () => {
  it('rejects unvalidated values at compile time', () => {
    const unvalidated = [
      // @ts-expect-error login needs SignInCredentials, not two strings
      () => api.login('testuser', 'test1234'),
      // @ts-expect-error sign-in checks are too weak to create an account
      () => api.addUser(validateCreds('testuser', 'test1234', 'signIn')),
      // @ts-expect-error a parsed Integer has not been checked against the limit
      () => api.checkOut('demoproj1', 'HWSet1', Integer.of(5)),
      // @ts-expect-error a plain string has not passed validateProjectID
      () => api.joinProject('testuser', 'demoproj1'),
    ]
    expect(unvalidated).toHaveLength(4)
  })

  it('accepts the same calls once the values are validated', () => {
    const validated = [
      () => api.addUser(validateCreds('testuser', 'test1234', 'signUp')),
      () => api.joinProject('testuser', validateProjectID('demoproj1')),
    ]
    expect(validated).toHaveLength(2)
  })
})
