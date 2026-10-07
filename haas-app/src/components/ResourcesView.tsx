import { useEffect, useState } from 'react'
import { api } from '../api.ts'
import type { HardwareSet } from '../api.ts'
import HardwareSetCard from './HardwareSetCard.tsx'

interface Props {
  projectID: string | null
}

export default function ResourcesView({ projectID }: Props) {
  const [sets, setSets] = useState<HardwareSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { names } = await api.getHardwareNames()
        const infos = await Promise.all(names.map((n) => api.getHardwareInfo(n)))
        if (!cancelled) setSets(infos)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load hardware')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const replace = (updated: HardwareSet) =>
    setSets((prev) => prev.map((s) => (s.name === updated.name ? updated : s)))

  return (
    <div>
      <div className="section-header">
        <div className="section-title">RESOURCES</div>
        <div className="section-desc">
          {projectID ? `Working under project · ${projectID}` : 'Select a project to check hardware in or out'}
        </div>
      </div>

      {error && <div className="msg msg-error">✕ {error}</div>}
      {loading && <div className="none-label">Loading hardware…</div>}

      {!projectID && !loading && (
        <div className="no-path" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>◈</span>
          Pick a project on the Projects tab before checking out hardware.
        </div>
      )}

      <div className="pair-grid hw-grid">
        {sets.map((s) =>
          projectID ? (
            <HardwareSetCard key={s.name} hwSet={s} projectID={projectID} onChange={replace} />
          ) : (
            <div key={s.name} className="card">
              <div className="card-title">{s.name}</div>
              <div className="pair-meta">
                {s.available} / {s.capacity} available
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
