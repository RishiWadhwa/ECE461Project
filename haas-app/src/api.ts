// Thin REST client. Every value shown in the UI comes through these calls (R2-2).
// Route names follow the README endpoint table; change them here if the Flask API differs.

export interface Project {
  projectID: string
  name: string
  description: string
}

export interface HardwareSet {
  name: string
  capacity: number
  available: number
}

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`)
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
