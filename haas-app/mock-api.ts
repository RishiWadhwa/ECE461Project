// Dev-only mock of the REST API, backed by the in-memory tables in mock-db.ts. NOT A FINAL MODULE.
// Enabled by vite.config.ts when VITE_API_URL is unset. Error cases follow docs/api_calls.pdf so the
// frontend's error handling can be exercised before the Flask backend exists.
//
// Simulated outage (for testing the offline status light):
//   fetch('/__mock/outage?seconds=15', { method: 'POST' })  -> API requests drop for 15s
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { createSeededDB, type MockDB } from './mock-db.ts'

export interface MockResponse { status: number; body: unknown }

const ok = (body: unknown): MockResponse => ({ status: 200, body })
const fail = (status: number, error: string): MockResponse => ({ status, body: { error } })

function addMember(db: MockDB, userID: string, projectID: string) {
  db.memberships.set(userID, (db.memberships.get(userID) ?? new Set()).add(projectID))
}

/**
 * Handles one API request against `db`. Returns null when the route is not part of the API,
 * so the dev server can pass the request on to Vite.
 */
export function handle(
  db: MockDB,
  method: string,
  path: string,
  query: URLSearchParams,
  b: Record<string, any>,
): MockResponse | null {
  const isPost = method === 'POST'

  switch (path) {
    case '/login':
      if (isPost && db.users.get(b.userID) === b.password) return ok({ userID: b.userID })
      return fail(401, 'Invalid userID or password')
    case '/add_user':
      if (!isPost) break
      if (db.users.has(b.userID)) return fail(409, 'User already exists')
      db.users.set(b.userID, b.password)
      return ok({ userID: b.userID })
    case '/get_user_projects_list': {
      const ids = db.memberships.get(query.get('userID') ?? '') ?? new Set()
      return ok({ projects: [...ids].map((id) => db.projects.get(id)) })
    }
    case '/get_project_info': {
      const p = db.projects.get(query.get('projectID') ?? '')
      if (!p) return fail(404, 'Project not found')
      const members = [...db.memberships].filter(([, ids]) => ids.has(p.projectID)).map(([u]) => u)
      return ok({ ...p, members })
    }
    case '/create_project':
      if (!isPost) break
      if (db.projects.has(b.projectID)) return fail(409, `Project ID "${b.projectID}" is already taken`)
      db.projects.set(b.projectID, { projectID: b.projectID, name: b.name, description: b.description })
      addMember(db, b.userID, b.projectID)
      return ok(db.projects.get(b.projectID))
    case '/join_project':
      if (!isPost) break
      if (!db.projects.has(b.projectID)) return fail(404, `No project with ID "${b.projectID}"`)
      if (db.memberships.get(b.userID)?.has(b.projectID)) return fail(409, 'You are already part of this project')
      addMember(db, b.userID, b.projectID)
      return ok(db.projects.get(b.projectID))
    case '/get_all_hw_names':
      return ok({ names: [...db.hardware.keys()] })
    case '/get_hw_info': {
      const hw = db.hardware.get(query.get('name') ?? '')
      return hw ? ok(hw) : fail(404, 'Hardware set not found')
    }
    case '/check_out':
    case '/check_in': {
      if (!isPost) break
      const hw = db.hardware.get(b.hwSet)
      if (!hw) return fail(404, 'Hardware set not found')
      if (!db.projects.has(b.projectID)) return fail(404, 'Project not found')
      const qty = Number(b.quantity)
      if (!Number.isInteger(qty) || qty <= 0) return fail(400, 'Invalid quantity')

      const held = db.holdings.get(b.projectID) ?? new Map<string, number>()
      const current = held.get(hw.name) ?? 0
      // 409 = the request was valid when the user typed it, but the shared state moved underneath them.
      if (path === '/check_out') {
        if (qty > hw.available) return fail(409, `Only ${hw.available} units of ${hw.name} available`)
        hw.available -= qty
        held.set(hw.name, current + qty)
      } else {
        if (qty > current) return fail(409, `Project ${b.projectID} only holds ${current} units of ${hw.name}`)
        hw.available += qty
        held.set(hw.name, current - qty)
      }
      db.holdings.set(b.projectID, held)
      return ok(hw)
    }
  }
  return null
}

function send(res: ServerResponse, { status, body }: MockResponse) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
  })
}

export function mockApi(): Plugin {
  const db = createSeededDB()
  let outageUntil = 0

  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')

        if (url.pathname === '/__mock/outage') {
          const seconds = Number(url.searchParams.get('seconds') ?? 15)
          outageUntil = Date.now() + seconds * 1000
          return send(res, ok({ outageSeconds: seconds }))
        }

        const body = req.method === 'POST' ? await readBody(req) : {}
        const result = handle(db, req.method ?? 'GET', url.pathname, url.searchParams, body)
        if (!result) return next()
        // Drop the connection instead of answering, which the browser sees as a network failure.
        if (Date.now() < outageUntil) return req.socket.destroy()
        send(res, result)
      })
    },
  }
}
