import { useEffect, useState } from 'react'
import { api } from '../api.ts'
import type { HardwareSet, ProjectInfo } from '../api.ts'
import HardwareSetCard from './HardwareSetCard.tsx'
import { errorMessage } from '../errors.ts'
import { useConnectionStatus } from '../connection.ts'

interface Props {
  projectID: string
  onBack: () => void
}

export default function ResourcesView({ projectID, onBack }: Props) {
  const [sets, setSets] = useState<HardwareSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const connection = useConnectionStatus()

  // Members and details of the project the user is working under.
  useEffect(() => {
    if (connection === 'offline') return
    let cancelled = false
    api.getProjectInfo(projectID).then(
      (info) => { if (!cancelled) setProject(info) },
      () => { if (!cancelled) setProject(null) },
    )
    return () => {
      cancelled = true
    }
  }, [projectID, connection])

  // Loads on mount, and again when the server comes back so stale numbers get replaced.
  useEffect(() => {
    if (connection === 'offline') return
    let cancelled = false
    ;(async () => {
      try {
        const { names } = await api.getHardwareNames()
        const infos = await Promise.all(names.map((n) => api.getHardwareInfo(n)))
        if (!cancelled) {
          setSets(infos)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Could not load hardware'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connection])

  const replace = (updated: HardwareSet) =>
    setSets((prev) => prev.map((s) => (s.name === updated.name ? updated : s)))

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Projects</button>
      <div className="section-header">
        <div className="section-title">RESOURCES</div>
        <div className="section-desc">Working under project · {projectID}</div>
      </div>

      {project && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">WORKING UNDER · {project.name || project.projectID}</div>
          <div className="project-desc">{project.description}</div>
          <div className="social-section-label" style={{ marginTop: 12 }}>Members</div>
          <div className="member-list">
            {project.members.map((m) => (
              <span key={m} className="member-chip">{m}</span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="msg msg-error">✕ {error}</div>}
      {loading && <div className="none-label">Loading hardware…</div>}

      <div className="pair-grid hw-grid">
        {sets.map((s) => (
          <HardwareSetCard key={s.name} hwSet={s} projectID={projectID} onChange={replace} />
        ))}
      </div>
    </div>
  )
}
