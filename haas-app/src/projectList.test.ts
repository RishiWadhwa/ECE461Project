import { describe, expect, it } from 'vitest'
import { filterProjects } from './projectList.ts'

const projects = [
  { projectID: 'PROJ0042', name: 'Edge Compute', description: '' },
  { projectID: 'PROJ0001', name: 'rf Lab', description: '' },
  { projectID: 'PROJ0002', name: '', description: '' },
]
const ids = (list: { projectID: string }[]) => list.map((p) => p.projectID)

describe('filterProjects', () => {
  it('keeps everything for a blank query, sorted by name (ID when there is no name)', () => {
    expect(ids(filterProjects(projects, '  ', 'name'))).toEqual(['PROJ0042', 'PROJ0002', 'PROJ0001'])
  })

  it('sorts by project ID', () => {
    expect(ids(filterProjects(projects, '', 'id'))).toEqual(['PROJ0001', 'PROJ0002', 'PROJ0042'])
  })

  it('matches name or ID, ignoring case', () => {
    expect(ids(filterProjects(projects, 'RF', 'name'))).toEqual(['PROJ0001'])
    expect(ids(filterProjects(projects, 'proj0042', 'name'))).toEqual(['PROJ0042'])
  })

  it('returns nothing when no project matches, and does not change the input', () => {
    const before = ids(projects)
    expect(filterProjects(projects, 'zzz', 'name')).toEqual([])
    expect(ids(projects)).toEqual(before)
  })
})
