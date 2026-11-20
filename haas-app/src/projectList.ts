import type { Project } from './api.ts'

export type ProjectSort = 'name' | 'id'

/**
 * Narrows the loaded project list for the search box and orders it for the sort menu. Runs in the browser on
 * the list already fetched, so it makes no requests. Returns a new array.
 * @param query Matched case-insensitively against the project's name and its ID. Blank keeps everything.
 * @param sort 'name' orders A-Z by name (the ID when there is no name); 'id' orders by project ID.
 */
export function filterProjects(projects: Project[], query: string, sort: ProjectSort): Project[] {
  const q = query.trim().toLowerCase()
  const label = (p: Project) => p.name || p.projectID
  const key = (p: Project) => (sort === 'name' ? label(p) : p.projectID)
  return projects
    .filter((p) => !q || label(p).toLowerCase().includes(q) || p.projectID.toLowerCase().includes(q))
    .sort((a, b) => key(a).localeCompare(key(b)))
}
