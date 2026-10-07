import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import type { Project } from '../api.ts'

interface Props {
  userID: string
  selectedID: string | null
  onSelect: (projectID: string) => void
}

export default function ProjectsView({ userID, selectedID, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newID, setNewID] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [joinID, setJoinID] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      const res = await api.getUserProjects(userID)
      setProjects(res.projects ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userID])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const create = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const p = await api.createProject(userID, {
        projectID: newID.trim(),
        name: newName.trim(),
        description: newDesc.trim(),
      })
      setNewID('')
      setNewName('')
      setNewDesc('')
      onSelect(p.projectID ?? newID.trim())
    })
  }

  const join = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const p = await api.joinProject(userID, joinID.trim())
      setJoinID('')
      onSelect(p.projectID ?? joinID.trim())
    })
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">PROJECTS</div>
        <div className="section-desc">Create a project, join one by ID, or pick one to work under</div>
      </div>

      {error && <div className="msg msg-error" style={{ marginBottom: 16 }}>✕ {error}</div>}

      <div className="two-col">
        <div>
          <div className="card-title">MY PROJECTS</div>
          {loading ? (
            <div className="none-label">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="no-path">You are not part of any project yet.</div>
          ) : (
            <div className="pods-grid">
              {projects.map((p) => (
                <button
                  key={p.projectID}
                  className={`pod-card project-card${selectedID === p.projectID ? ' selected' : ''}`}
                  onClick={() => onSelect(p.projectID)}
                >
                  <div className="pod-label">{p.name || p.projectID}</div>
                  <div className="pair-meta">ID · {p.projectID}</div>
                  <div className="project-desc">{p.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-stack">
          <form className="form-panel" onSubmit={create}>
            <div className="card-title">CREATE PROJECT</div>
            <div className="form-row">
              <label className="form-label" htmlFor="p-name">Name</label>
              <input id="p-name" className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="p-id">Project ID</label>
              <input id="p-id" className="form-input" value={newID} onChange={(e) => setNewID(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="p-desc">Description</label>
              <input id="p-desc" className="form-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <button className="btn btn-block" disabled={busy || !newID.trim() || !newName.trim()}>
              Create Project
            </button>
          </form>

          <form className="form-panel" onSubmit={join}>
            <div className="card-title">JOIN PROJECT</div>
            <div className="form-row">
              <label className="form-label" htmlFor="j-id">Project ID</label>
              <input id="j-id" className="form-input" value={joinID} onChange={(e) => setJoinID(e.target.value)} />
            </div>
            <button className="btn btn-block" disabled={busy || !joinID.trim()}>
              Join Project
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
