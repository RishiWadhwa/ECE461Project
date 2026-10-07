// Dev-only mock of the REST API (in-memory). Enabled by vite.config.ts when VITE_API_URL is unset.
// Seeded login: userID "testuser", password "test1234".
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

interface Project { projectID: string; name: string; description: string }
interface HardwareSet { name: string; capacity: number; available: number }

const users = new Map<string, string>([['testuser', 'test1234']])
const projects = new Map<string, Project>([
  ['demo1', { projectID: 'demo1', name: 'Demo Project', description: 'Seeded sample project' }],
])
const memberships = new Map<string, Set<string>>([['testuser', new Set(['demo1'])]])
const hardware = new Map<string, HardwareSet>([
  ['HWSet1', { name: 'HWSet1', capacity: 100, available: 100 }],
  ['HWSet2', { name: 'HWSet2', capacity: 100, available: 100 }],
])

function send(res: ServerResponse, status: number, body: unknown) {
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
  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = url.pathname
        const isPost = req.method === 'POST'
        const b = isPost ? await readBody(req) : {}

        switch (path) {
          case '/login':
            if (isPost && users.get(b.userID) === b.password) return send(res, 200, { userID: b.userID })
            return send(res, 401, { error: 'Invalid userID or password' })
          case '/add_user':
            if (!isPost) break
            if (users.has(b.userID)) return send(res, 409, { error: 'User already exists' })
            users.set(b.userID, b.password)
            return send(res, 200, { userID: b.userID })
          case '/get_user_projects_list': {
            const ids = memberships.get(url.searchParams.get('userID') ?? '') ?? new Set()
            return send(res, 200, { projects: [...ids].map((id) => projects.get(id)) })
          }
          case '/create_project':
            if (!isPost) break
            if (projects.has(b.projectID)) return send(res, 409, { error: 'Project ID already exists' })
            projects.set(b.projectID, { projectID: b.projectID, name: b.name, description: b.description })
            memberships.set(b.userID, (memberships.get(b.userID) ?? new Set()).add(b.projectID))
            return send(res, 200, projects.get(b.projectID))
          case '/join_project':
            if (!isPost) break
            if (!projects.has(b.projectID)) return send(res, 404, { error: 'Project not found' })
            memberships.set(b.userID, (memberships.get(b.userID) ?? new Set()).add(b.projectID))
            return send(res, 200, projects.get(b.projectID))
          case '/get_all_hw_names':
            return send(res, 200, { names: [...hardware.keys()] })
          case '/get_hw_info': {
            const hw = hardware.get(url.searchParams.get('name') ?? '')
            return hw ? send(res, 200, hw) : send(res, 404, { error: 'Hardware set not found' })
          }
          case '/check_out':
          case '/check_in': {
            if (!isPost) break
            const hw = hardware.get(b.hwSet)
            if (!hw) return send(res, 404, { error: 'Hardware set not found' })
            const qty = Number(b.quantity)
            if (!Number.isInteger(qty) || qty <= 0) return send(res, 400, { error: 'Invalid quantity' })
            if (path === '/check_out') hw.available = Math.max(0, hw.available - qty)
            else hw.available = Math.min(hw.capacity, hw.available + qty)
            return send(res, 200, hw)
          }
        }
        next()
      })
    },
  }
}
