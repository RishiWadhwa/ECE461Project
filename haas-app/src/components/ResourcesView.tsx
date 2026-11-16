import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.ts'
import type { HardwareSet, ProjectInfo } from '../api.ts'
import HardwareSetCard from './HardwareSetCard.tsx'
import { errorMessage } from '../errors.ts'
import { useConnectionStatus } from '../connection.ts'

// How often the numbers are re-read so other users' check-outs show up. Only while the tab is visible and online.
const POLL_INTERVAL_MS = 15000

interface Props {
  projectID: string
  userID: string
  onBack: () => void
}

export default function ResourcesView({ projectID, userID, onBack }: Props) {
  const [sets, setSets] = useState<HardwareSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const connection = useConnectionStatus()
  const alive = useRef(true)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Bumped whenever a card reports its own result, so a slower reload that started earlier cannot overwrite it.
  const version = useRef(0)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(copyTimer.current)
    }
  }, [])

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

  // Reads every set. A 'poll' reload keeps quiet on failure (the connection banner already says so); only a
  // 'manual' one is started by the Refresh button, which sets the Refreshing label itself (not from an effect).
  const load = useCallback(async (reason: 'initial' | 'manual' | 'poll') => {
    const started = version.current
    try {
      const { names } = await api.getHardwareNames()
      const infos = await Promise.all(names.map((n) => api.getHardwareInfo(n)))
      if (!alive.current || started !== version.current) return
      setSets(infos)
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      if (alive.current && reason !== 'poll') setError(errorMessage(err, 'Could not load hardware'))
    } finally {
      if (alive.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  // Loads on mount, and again when the server comes back so stale numbers get replaced.
  useEffect(() => {
    if (connection === 'offline') return
    // load() only sets state after its awaited requests finish, never synchronously here.
    // oxlint-disable-next-line react/set-state-in-effect
    load('initial')
  }, [connection, load])

  // Re-reads on a timer and when the tab becomes visible again. A hidden tab makes no requests.
  useEffect(() => {
    if (connection === 'offline') return
    const tick = () => {
      if (document.visibilityState === 'visible') load('poll')
    }
    const timer = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [connection, load])

  const refreshNow = () => {
    setRefreshing(true)
    load('manual')
  }

  const replace = (updated: HardwareSet) => {
    version.current++
    setSets((prev) => prev.map((s) => (s.name === updated.name ? updated : s)))
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>← Projects</button>
      <div className="section-header">
        <div className="section-title">RESOURCES</div>
        <div className="section-desc">Working under project · {projectID}</div>
        <div className="refresh-row">
          <button className="btn btn-ghost btn-sm" disabled={refreshing || connection === 'offline'} onClick={refreshNow}>
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
  )
}
