// Thin REST client. Every value shown in the UI comes through these calls (R2-2).
// Route names follow the README endpoint table; change them here if the Flask API differs.
import { ApiError, AppError } from './errors.ts'
import { markOffline, markOnline, setProbe } from './connection.ts'

export interface Project {
  projectID: string
  name: string
  description: string
}

export interface ProjectInfo extends Project {
  members: string[]
}

export interface HardwareSet {
  name: string
  capacity: number
  available: number
}

/**
 * Thrown when a request never got an answer from the server: it is down, the network dropped,
 * or it took longer than REQUEST_TIMEOUT_MS. Unlike ApiError there is no HTTP status.
 */
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export const REQUEST_TIMEOUT_MS = 8000

// A proxy or load balancer answers with these when the backend behind it is down.
const GATEWAY_DOWN = new Set([502, 503, 504])

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...init,
    })
  } catch (err) {
    markOffline()
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new NetworkError('The server took too long to respond. Please try again.')
    }
    throw new NetworkError('Cannot reach the server. Check your connection and try again.')
  }

  if (GATEWAY_DOWN.has(res.status)) markOffline()
  else markOnline()

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? body.message ?? `HTTP ${res.status}`)
  return body as T
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) })

const q = (params: Record<string, string>) => '?' + new URLSearchParams(params).toString()

export const api = {
  login: (userID: string, password: string) =>
    post<{ userID: string }>('/login', { userID, password }),
  addUser: (userID: string, password: string) =>
    post<{ userID: string }>('/add_user', { userID, password }),

  getUserProjects: (userID: string) =>
    request<{ projects: Project[] }>('/get_user_projects_list' + q({ userID })),
  getProjectInfo: (projectID: string) =>
    request<ProjectInfo>('/get_project_info' + q({ projectID })),
  createProject: (userID: string, project: Project) =>
    post<Project>('/create_project', { userID, ...project }),
  joinProject: (userID: string, projectID: string) =>
    post<Project>('/join_project', { userID, projectID }),

  getHardwareNames: () => request<{ names: string[] }>('/get_all_hw_names'),
  getHardwareInfo: (name: string) => request<HardwareSet>('/get_hw_info' + q({ name })),
  checkOut: (projectID: string, hwSet: string, quantity: number) =>
    post<HardwareSet>('/check_out', { projectID, hwSet, quantity }),
  checkIn: (projectID: string, hwSet: string, quantity: number) =>
    post<HardwareSet>('/check_in', { projectID, hwSet, quantity }),
}

// While offline, connection.ts retries this cheap read-only call to detect when the server is back.
setProbe(api.getHardwareNames)
