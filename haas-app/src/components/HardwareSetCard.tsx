import { useState } from 'react'
import { api } from '../api.ts'
import type { HardwareSet } from '../api.ts'

interface Props {
  hwSet: HardwareSet
  projectID: string
  onChange: (updated: HardwareSet) => void
}

export default function HardwareSetCard({ hwSet, projectID, onChange }: Props) {
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const amount = Number(qty)
  const valid = Number.isInteger(amount) && amount > 0
  const pct = hwSet.capacity > 0 ? (hwSet.available / hwSet.capacity) * 100 : 0

  const submit = async (kind: 'out' | 'in') => {
    setBusy(true)
    setMessage(null)
    try {
      const call = kind === 'out' ? api.checkOut : api.checkIn
      const updated = await call(projectID, hwSet.name, amount)
      onChange(updated)
      setQty('')
      setMessage({ ok: true, text: `${kind === 'out' ? 'Checked out' : 'Checked in'} ${amount} unit${amount === 1 ? '' : 's'}` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Request failed' })
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
        <button className="btn" disabled={busy || !valid} onClick={() => submit('out')}>Check Out</button>
        <button className="btn btn-ghost" disabled={busy || !valid} onClick={() => submit('in')}>Check In</button>
      </div>

      {message && (
        <div className={`msg ${message.ok ? 'msg-ok' : 'msg-error'}`} style={{ marginTop: 12 }}>
          {message.ok ? '✓' : '✕'} {message.text}
        </div>
      )}
    </div>
  )
}
