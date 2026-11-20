import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type HardwareSet } from './api.ts'
import { useConnectionStatus } from './connection.ts'
import { errorMessage } from './errors.ts'

// How often the numbers are re-read so other users' check-outs show up. Only while the tab is visible and online.
export const POLL_INTERVAL_MS = 15000

/**
 * Keeps every hardware set's numbers, including what `projectID` holds, up to date for the Resources page.
 * Each read is one GET /hw_availability request. Whether the server is up is connection.ts's job (its
 * heartbeat); this hook only pauses while offline and reloads when the server comes back.
 *
 * `replace` is for a card's own check-out or check-in result. It wins over any reload that started before it,
 * so a slower poll cannot put back the numbers from before the user's change.
 */
export function useLiveHardware(projectID: string) {
  const [sets, setSets] = useState<HardwareSet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const connection = useConnectionStatus()
  const alive = useRef(true)
  // Bumped whenever a card reports its own result, so a slower reload that started earlier cannot overwrite it.
  const version = useRef(0)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // A 'poll' reload keeps quiet on failure (the connection banner already says so); only a 'manual' one is
  // started by the Refresh button, which sets the Refreshing label itself (not from an effect).
  const load = useCallback(async (reason: 'initial' | 'manual' | 'poll') => {
    const started = version.current
    try {
      const latest = await api.getHardwareAvailability(projectID)
      if (!alive.current || started !== version.current) return
      setSets(latest)
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
  }, [projectID])

  // Loads on mount, and again when the server comes back so stale numbers get replaced.
  useEffect(() => {
    if (connection === 'offline') return
    // load() only sets state after its awaited request finishes, never synchronously here.
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

  const refresh = () => {
    setRefreshing(true)
    load('manual')
  }

  const replace = (updated: HardwareSet) => {
    version.current++
    setSets((prev) => prev.map((s) => (s.name === updated.name ? updated : s)))
  }

  return { sets, loading, refreshing, error, updatedAt, refresh, replace }
}
