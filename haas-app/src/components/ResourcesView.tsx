import { useEffect, useRef, useState } from 'react'
import { api } from '../api.ts'
import type { ProjectInfo } from '../api.ts'
import HardwareSetCard from './HardwareSetCard.tsx'
import ActivityList from './ActivityList.tsx'
import { useConnectionStatus } from '../connection.ts'
import { useLiveHardware } from '../useLiveHardware.ts'

interface Props {
  projectID: string
  userID: string
  onBack: () => void
}

export default function ResourcesView({ projectID, userID, onBack }: Props) {
  const { sets, loading, refreshing, error, updatedAt, refresh, replace } = useLiveHardware(projectID)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const connection = useConnectionStatus()
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  // Copies the project ID so it can be shared with someone who needs to join. The clipboard can be refused
  // (insecure page, permission denied), so a failure shows the ID to copy by hand.
  const copyID = async () => {
    try {
      await navigator.clipboard.writeText(projectID)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopy('idle'), 4000)
  }

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

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Projects</button>
      <div className="section-header">
        <div className="section-title">RESOURCES</div>
        <div className="section-desc">Working under project · {projectID}</div>
        <div className="refresh-row">
          <button className="btn btn-ghost btn-sm" disabled={refreshing || connection === 'offline'} onClick={refresh}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          {updatedAt && <span className="none-label">Updated {updatedAt.toLocaleTimeString()}</span>}
        </div>
      </div>

      {project && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">WORKING UNDER · {project.name || project.projectID}</div>
          <div className="project-desc">{project.description}</div>
          <div className="refresh-row">
            <button className="btn btn-ghost btn-sm" onClick={copyID}>Copy ID</button>
            {copy === 'copied' && <span className="msg-ok">✓ Copied {projectID}</span>}
            {copy === 'failed' && <span className="msg-warn">! Could not copy. The ID is {projectID}</span>}
          </div>
          <div className="social-section-label" style={{ marginTop: 12 }}>Members</div>
          <div className="member-list">
            {project.members.map((m) => (
              <span key={m} className="member-chip">{m}</span>
            ))}
          </div>
        </div>
      )}

      <div className="two-col activity-split">
        <div>
          {error && <div className="msg msg-error">✕ {error}</div>}
          {loading && <div className="none-label">Loading hardware…</div>}
          {/* The server answered with an empty list: usually the database has no hardware documents yet. */}
          {!loading && !error && sets.length === 0 && <div className="none-label">No hardware sets found.</div>}

          <div className="pair-grid hw-grid">
            {sets.map((s) => (
              <HardwareSetCard key={s.name} hwSet={s} projectID={projectID} userID={userID} onChange={replace} />
            ))}
          </div>
        </div>

        {/* Beside the cards, so a long log scrolls here instead of pushing them down the page. The wrapper
            is as tall as the cards and the list inside it scrolls (see .activity-col in index.css). */}
        <div className="activity-col">
          <ActivityList projectID={projectID} />
        </div>
      </div>
    </div>
  )
}
