import { beforeEach, describe, expect, it } from 'vitest'
import { handle } from './mock-api.ts'
import { createSeededDB, type MockDB } from './mock-db.ts'

let db: MockDB

const get = (path: string, params: Record<string, string> = {}) =>
  handle(db, 'GET', path, new URLSearchParams(params), {})
const post = (path: string, body: Record<string, unknown>) =>
  handle(db, 'POST', path, new URLSearchParams(), body)

beforeEach(() => {
  db = createSeededDB()
})

describe('mock users', () => {
  it('logs in a seeded user and rejects a wrong password', () => {
    expect(post('/login', { userID: 'testuser', password: 'test1234' })?.status).toBe(200)
    expect(post('/login', { userID: 'testuser', password: 'nope' })?.status).toBe(401)
  })

  it('rejects a duplicate userID with 409', () => {
    expect(post('/add_user', { userID: 'alice', password: 'x' })?.status).toBe(409)
  })

  it('rejects a new account that breaks the userID or password rules with 400', () => {
    expect(post('/add_user', { userID: 'ab', password: 'password1' })?.status).toBe(400)
    expect(post('/add_user', { userID: 'bad user!', password: 'password1' })?.status).toBe(400)
    expect(post('/add_user', { userID: 'newuser', password: 'short' })?.status).toBe(400)
    expect(post('/login', { userID: 'newuser', password: 'short' })?.status).toBe(401)
  })
})

describe('mock projects', () => {
  it('creates a project and adds the creator as a member', () => {
    expect(post('/create_project', { userID: 'alice', projectID: 'project9', name: 'P9', description: '' })?.status).toBe(200)
    expect(get('/get_project_info', { projectID: 'project9' })?.body).toMatchObject({ members: ['alice'] })
  })

  it('rejects a project ID that breaks the project ID rules with 400', () => {
    expect(post('/create_project', { userID: 'alice', projectID: 'p9', name: 'P9', description: '' })?.status).toBe(400)
    expect(post('/create_project', { userID: 'alice', projectID: 'bad-id-123', name: 'x', description: '' })?.status).toBe(400)
  })

  it('rejects a taken project ID with 409', () => {
    expect(post('/create_project', { userID: 'alice', projectID: 'demo1', name: 'x', description: '' })?.status).toBe(409)
  })

  it('returns 404 for an unknown project and 409 when already a member', () => {
    expect(post('/join_project', { userID: 'alice', projectID: 'missing' })?.status).toBe(404)
    expect(post('/join_project', { userID: 'testuser', projectID: 'demo1' })?.status).toBe(409)
    expect(post('/join_project', { userID: 'alice', projectID: 'demo1' })?.status).toBe(200)
  })
})

describe('mock hardware', () => {
  it('moves units between the pool and the project', () => {
    expect(post('/check_out', { projectID: 'edge42', hwSet: 'HWSet2', quantity: 5 })?.body).toMatchObject({ available: 80 })
    expect(post('/check_in', { projectID: 'edge42', hwSet: 'HWSet2', quantity: 5 })?.body).toMatchObject({ available: 85 })
  })

  it('returns 409 when another project already took the units', () => {
    // Both users saw 70 available; the first checkout wins and the second is refused.
    expect(post('/check_out', { projectID: 'demo1', hwSet: 'HWSet1', quantity: 60 })?.status).toBe(200)
    const late = post('/check_out', { projectID: 'edge42', hwSet: 'HWSet1', quantity: 60 })
    expect(late?.status).toBe(409)
    expect(late?.body).toEqual({ error: 'Only 10 units of HWSet1 available' })
  })

  it('refuses to check in more than the project holds', () => {
    expect(post('/check_in', { projectID: 'demo1', hwSet: 'HWSet1', quantity: 21 })?.status).toBe(409)
    expect(post('/check_in', { projectID: 'demo1', hwSet: 'HWSet2', quantity: 1 })?.status).toBe(409)
  })

  it('rejects non-positive or fractional quantities with 400', () => {
    expect(post('/check_out', { projectID: 'demo1', hwSet: 'HWSet1', quantity: 0 })?.status).toBe(400)
    expect(post('/check_out', { projectID: 'demo1', hwSet: 'HWSet1', quantity: 1.5 })?.status).toBe(400)
  })

  it('passes non-API routes through to Vite', () => {
    expect(get('/src/main.tsx')).toBeNull()
  })
})
