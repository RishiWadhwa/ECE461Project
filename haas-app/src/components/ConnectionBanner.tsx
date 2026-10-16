import { checkNow, PROBE_INTERVAL_MS, useConnectionStatus } from '../connection.ts'

// Shown across the top of the page while the API server cannot be reached.
export default function ConnectionBanner() {
  const status = useConnectionStatus()
  if (status === 'online') return null

  return (
    <div className="conn-banner" role="status">
      <span>
        ✕ Cannot reach the server. Retrying every {PROBE_INTERVAL_MS / 1000}s — check-outs and other
        changes will not go through until it is back.
      </span>
      <button className="btn btn-ghost btn-sm" onClick={checkNow}>Retry now</button>
    </div>
  )
}
