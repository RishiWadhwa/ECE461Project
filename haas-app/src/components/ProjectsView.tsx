import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import type { Project, ProjectInfo } from '../api.ts'
import { ApiError, errorMessage } from '../errors.ts'
import { useConnectionStatus } from '../connection.ts'

interface Props {
  userID: string
  selectedID: string | null
  onSelect: (projectID: string) => void
}

export default function ProjectsView({ userID, selectedID, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProjectInfo | null>(null)
  const connection = useConnectionStatus()

  const [newID, setNewID] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinID, setJoinID] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      const res = await api.getUserProjects(userID)
      setProjects(res.projects ?? [])
      setListError(null)
    } catch (err) {
      setListError(errorMessage(err, 'Could not load projects'))
    } finally {
      setLoading(false)
    }
  }

  // Loads on mount, and again when the server comes back after an outage.
  useEffect(() => {
    if (connection === 'online') refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userID, connection])

  // Members and details of the project the user is working under.
  useEffect(() => {
    if (!selectedID || connection === 'offline') return
    let cancelled = false
    api.getProjectInfo(selectedID).then(
      (info) => { if (!cancelled) setSelected(info) },
      () => { if (!cancelled) setSelected(null) },
    )
    return () => {
      cancelled = true
    }
  }, [selectedID, connection])

  const run = async (action: () => Promise<unknown>, setError: (msg: string | null) => void, fallback: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(errorMessage(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const create = (e: FormEvent) => {
    e.preventDefault()
    const projectID = newID.trim()
    run(async () => {
      const p = await api.createProject(userID, {
        projectID,
        name: newName.trim(),
        description: newDesc.trim(),
      })
      setNewID('')
      setNewName('')
      setNewDesc('')
      onSelect(p.projectID ?? projectID)
    }, setCreateError, 'Could not create project')
  }

  const join = (e: FormEvent) => {
    e.preventDefault()
    const projectID = joinID.trim()
    run(async () => {
      try {
        const p = await api.joinProject(userID, projectID)
        onSelect(p.projectID ?? projectID)
      } catch (err) {
        // Already a member: nothing to join, so just switch to that project.
        if (err instanceof ApiError && err.isConflict() && projects.some((p) => p.projectID === projectID)) {
          onSelect(projectID)
        } else {
          throw err
        }
      }
      setJoinID('')
    }, setJoinError, 'Could not join project')
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">PROJECTS</div>
        <div className="section-desc">Create a project, join one by ID, or pick one to work under</div>
      </div>

      {listError && <div className="msg msg-error" style={{ marginBottom: 16 }}>✕ {listError}</div>}

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

          {selected && selected.projectID === selectedID && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">WORKING UNDER · {selected.name || selected.projectID}</div>
              <div className="project-desc">{selected.description}</div>
              <div className="social-section-label" style={{ marginTop: 12 }}>Members</div>
              <div className="member-list">
                {selected.members.map((m) => (
                  <span key={m} className="member-chip">{m}</span>
                ))}
              </div>
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
            {createError && <div className="msg msg-error" style={{ marginBottom: 12 }}>✕ {createError}</div>}
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
            {joinError && <div className="msg msg-error" style={{ marginBottom: 12 }}>✕ {joinError}</div>}
            <button className="btn btn-block" disabled={busy || !joinID.trim()}>
              Join Project
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
