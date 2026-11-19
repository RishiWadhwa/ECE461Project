// Tracks whether the API server and its database are reachable. api.ts reports the outcome of every request
// here, and the header's status light reads it through useConnectionStatus().
// A heartbeat (startHeartbeat) calls GET /health every PROBE_INTERVAL_MS, online or offline, so the light
// also turns red when the server goes down while the page sits idle. This file only knows whether the server
// is up; re-reading data on a timer belongs to the pages that show it.
import { useSyncExternalStore } from 'react'

export type ConnectionStatus = 'online' | 'offline'

export const PROBE_INTERVAL_MS = 5000

/** Tooltip for a write button (check out, create, join, ...) that is disabled while the server is unreachable. */
export const OFFLINE_HINT = 'Unavailable while the server is unreachable'

let status: ConnectionStatus = 'online'
let probe: (() => Promise<unknown>) | null = null
let inFlight = false
const listeners = new Set<() => void>()

function setStatus(next: ConnectionStatus) {
  if (next === status) return
  status = next
  listeners.forEach((l) => l())
}

/**
 * Runs the probe once; its request goes through api.ts, which reports the result back here.
 * Does nothing while the previous check is still waiting, so a slow server never has pings piling up.
 */
export function checkNow() {
  if (!probe || inFlight) return
  inFlight = true
  probe().catch(() => {}).finally(() => { inFlight = false })
}

/** Called by api.ts whenever the server answers. */
export function markOnline() {
  setStatus('online')
}

/** Called by api.ts when a request never reached the server (or a gateway says it is down). */
export function markOffline() {
  setStatus('offline')
}

/** Registers the request used to check the server (api.ts registers GET /health). */
export function setProbe(fn: () => Promise<unknown>) {
  probe = fn
}

/**
 * Checks the server now and then every PROBE_INTERVAL_MS. A hidden tab skips its checks and checks again
 * as soon as it is shown. main.tsx starts it once; tests start and stop their own.
 * @returns A function that stops the heartbeat.
 */
export function startHeartbeat(): () => void {
  const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
  const tick = () => { if (visible()) checkNow() }
  const timer = setInterval(tick, PROBE_INTERVAL_MS)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', tick)
  tick()
  return () => {
    clearInterval(timer)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', tick)
  }
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
