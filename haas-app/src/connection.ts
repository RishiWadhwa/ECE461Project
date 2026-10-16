// Tracks whether the API server is reachable. api.ts reports the outcome of every request here,
// and the header's status light reads it through useConnectionStatus().
// While offline, a probe request is retried every PROBE_INTERVAL_MS until the server answers again.
import { useSyncExternalStore } from 'react'

export type ConnectionStatus = 'online' | 'offline'

export const PROBE_INTERVAL_MS = 5000

let status: ConnectionStatus = 'online'
let probe: (() => Promise<unknown>) | null = null
let probeTimer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function setStatus(next: ConnectionStatus) {
  if (next === status) return
  status = next
  listeners.forEach((l) => l())
}

function stopProbing() {
  if (probeTimer !== null) clearInterval(probeTimer)
  probeTimer = null
}

/** Runs the probe once; its request goes through api.ts, which reports the result back here. */
export function checkNow() {
  probe?.().catch(() => {})
}

/** Called by api.ts whenever the server answers. */
export function markOnline() {
  stopProbing()
  setStatus('online')
}

/** Called by api.ts when a request never reached the server (or a gateway says it is down). */
export function markOffline() {
  setStatus('offline')
  if (probe && probeTimer === null) probeTimer = setInterval(checkNow, PROBE_INTERVAL_MS)
}

/** Registers the request used to test whether the server is back. */
export function setProbe(fn: () => Promise<unknown>) {
  probe = fn
}

export function getConnectionStatus(): ConnectionStatus {
  return status
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: re-renders the component when the server goes offline or comes back. */
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribeConnection, getConnectionStatus)
}

// The browser knows when the machine itself loses its network; check the server when it returns.
if (typeof window !== 'undefined') {
  window.addEventListener('offline', markOffline)
  window.addEventListener('online', checkNow)
}
