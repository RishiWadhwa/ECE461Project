import { useState } from 'react'
import { api } from '../api.ts'
import type { HardwareSet } from '../api.ts'
import { ApiError, ValidationError, errorMessage } from '../errors.ts'
import { validateQuantity } from '../validation.ts'

interface Props {
  hwSet: HardwareSet
  projectID: string
  onChange: (updated: HardwareSet) => void
}

export default function HardwareSetCard({ hwSet, projectID, onChange }: Props) {
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  const amount = Number(qty)
  const pct = hwSet.capacity > 0 ? (hwSet.available / hwSet.capacity) * 100 : 0

  const submit = async (kind: 'out' | 'in') => {
    setBusy(true)
    setMessage(null)
    try {
      // Check-in limit is the units this project holds, which the API does not expose yet,
      // so only the server enforces it for now.
      validateQuantity(amount, kind === 'out' ? hwSet.available : Number.MAX_SAFE_INTEGER)
      const call = kind === 'out' ? api.checkOut : api.checkIn
      const updated = await call(projectID, hwSet.name, amount)
      onChange(updated)
      setQty('')
      setMessage({ kind: 'ok', text: `${kind === 'out' ? 'Checked out' : 'Checked in'} ${amount} unit${amount === 1 ? '' : 's'}` })
    } catch (err) {
      if (err instanceof ValidationError) {
        setMessage({ kind: 'error', text: err.messageFor('quantity') ?? errorMessage(err, 'Invalid quantity') })
        return
      }
      // Another user may have changed this set (409), or a dropped request may or may not have
      // gone through, so the numbers on screen can be stale either way. Refetch before retrying.
      const refreshed = await api.getHardwareInfo(hwSet.name).then(
        (latest) => { onChange(latest); return true },
        () => false,
      )
      if (err instanceof ApiError && err.isConflict()) {
        setMessage({ kind: 'warn', text: `${errorMessage(err, 'Request conflicted')}. Availability refreshed; another user may have changed it.` })
      } else {
        setMessage({ kind: 'error', text: errorMessage(err, 'Request failed') + (refreshed ? ' Availability refreshed.' : '') })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card hw-card">
      <div className="card-title">{hwSet.name}</div>

      <div className="hw-stats">
        <div>
          <div className="social-section-label">Capacity</div>
          <div className="hw-number">{hwSet.capacity}</div>
        </div>
        <div>
          <div className="social-section-label">Available</div>
          <div className="hw-number hw-available">{hwSet.available}</div>
        </div>
      </div>

      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="form-row" style={{ marginTop: 18 }}>
        <label className="form-label" htmlFor={`qty-${hwSet.name}`}>Quantity</label>
        <input
          id={`qty-${hwSet.name}`}
          className="form-input"
          inputMode="numeric"
          placeholder="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>

      <div className="btn-row">
        <button className="btn" disabled={busy || !qty.trim()} onClick={() => submit('out')}>Check Out</button>
        <button className="btn btn-ghost" disabled={busy || !qty.trim()} onClick={() => submit('in')}>Check In</button>
      </div>

      {message && (
        <div className={`msg msg-${message.kind}`} style={{ marginTop: 12 }}>
          {message.kind === 'ok' ? '✓' : message.kind === 'warn' ? '!' : '✕'} {message.text}
        </div>
      )}
    </div>
  )
}
