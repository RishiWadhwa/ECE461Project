import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import type { HardwareSet } from '../api.ts'
import { ApiError, NumberFormatError, ValidationError, errorMessage, type NumberFormatReason } from '../errors.ts'
import { validateQuantity } from '../validation.ts'
import { Integer } from '../math.ts'
import { enqueue } from '../session.ts'
import { OFFLINE_HINT, useConnectionStatus } from '../connection.ts'

interface Props {
  hwSet: HardwareSet
  projectID: string
  userID: string
  onChange: (updated: HardwareSet) => void
}

// What the quantity box shows for each way Integer.valueOf() can reject the text. Typed by reason,
// so adding a reason to NumberFormatError fails the build until it has a message here.
const QUANTITY_FORMAT_MESSAGES: Record<NumberFormatReason, string> = {
  empty: 'Quantity is required!',
  decimal: 'Quantity must be a whole number, not a decimal!',
  invalid: 'Quantity must be a whole number!',
  outOfRange: 'Quantity is too large!',
}

// How much of the set is still available, in steps. Each step colors the Available number and the bar, and every
// step except "ok" shows a warning naming the percentage.
type Stock = 'ok' | 'medium' | 'low' | 'critical' | 'empty'

const STOCK_WARNINGS: Record<Exclude<Stock, 'ok'>, string> = {
  medium: '! Under 50% available',
  low: '! Under 25% available',
  critical: '✕ Under 10% available',
  empty: '✕ All units are checked out',
}

function stockLevel(available: number, percent: number): Stock {
  if (available <= 0) return 'empty'
  if (percent < 10) return 'critical'
  if (percent < 25) return 'low'
  if (percent < 50) return 'medium'
  return 'ok'
}

export default function HardwareSetCard({ hwSet, projectID, userID, onChange }: Props) {
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const offline = useConnectionStatus() === 'offline'
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  const pct = hwSet.capacity > 0 ? (hwSet.available / hwSet.capacity) * 100 : 0
  const stock = stockLevel(hwSet.available, pct)

  const submit = async (kind: 'out' | 'in') => {
    setBusy(true)
    setMessage(null)
    try {
      // Check-in limit is the units this project holds, which the API does not expose yet,
      // so only the server enforces it for now. Future feature: use hwSet.checkedOut here once it exists.
      let amount: Integer
      try {
        amount = Integer.valueOf(qty)
      } catch (err) {
        if (err instanceof NumberFormatError) {
          setMessage({ kind: 'error', text: QUANTITY_FORMAT_MESSAGES[err.reason] })
          return
        }
        throw err
      }
      // Built outside the inner try: a bad count from the server is not the user's typing mistake.
      const max = Integer.of(kind === 'out' ? hwSet.available : Number.MAX_SAFE_INTEGER)
      const quantity = validateQuantity(amount, max)
      const call = kind === 'out' ? api.checkOut : api.checkIn
      const updated = await enqueue(`${projectID}:${hwSet.name}`, () => call(userID, projectID, hwSet.name, quantity))
      onChange(updated)
      setQty('')
      setMessage({ kind: 'ok', text: `${kind === 'out' ? 'Checked out' : 'Checked in'} ${quantity} unit${quantity.intValue() === 1 ? '' : 's'}` })
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

  // + and - only edit the text. submit() still runs every check, so the quantity rules stay in one place.
  // A decimal like 2.5 moves to the next whole number in that direction (+ gives 3, - gives 2). Text that is not a number counts as 0.
  // The result stays between 0 and the units available.
  const step = (delta: 1 | -1) => {
    const text = qty.trim()
    const current = /^-?([0-9]+[.]?[0-9]*|[.][0-9]+)$/.test(text) ? Number(text) : 0
    const next = delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1
    setQty(String(delta > 0 ? Math.min(hwSet.available, Math.max(0, next)) : Math.max(0, next)))
  }

  // Enter in the quantity box checks out (the Check In button is type="button", so it never submits the form).
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit('out')
  }

  return (
    <div className="card hw-card">
      <div className="card-title">{hwSet.name}</div>

      {/* Future feature (after the checkpoint): swap the next line for
          <div className="hw-stats hw-stats-3">
          so three stats fit without overlapping (see .hw-stats-3 in index.css). */}
      <div className="hw-stats">
        <div>
          <div className="social-section-label">Capacity</div>
          <div className="hw-number">{hwSet.capacity}</div>
        </div>
        <div>
          <div className="social-section-label">Available</div>
          <div className={'hw-number hw-available stock-' + stock}>{hwSet.available}</div>
        </div>
        {/* Future feature (after the checkpoint): units this project holds, from a backend endpoint
            that does not exist yet (e.g. a checkedOut field on get_hw_info for the current project).
        <div>
          <div className="social-section-label">Checked Out</div>
          <div className="hw-number">{hwSet.checkedOut}</div>
        </div>
        */}
      </div>

      <div className={`meter-track meter-${stock}`}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      {stock !== 'ok' && <div className={'stock-note stock-' + stock}>{STOCK_WARNINGS[stock]}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-row" style={{ marginTop: 18 }}>
          <label className="form-label" htmlFor={`qty-${hwSet.name}`}>Quantity</label>
          <div className="qty-row">
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Decrease quantity" disabled={busy} onClick={() => step(-1)}>−</button>
            <input
              id={`qty-${hwSet.name}`}
              className="form-input"
              inputMode="numeric"
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Increase quantity" disabled={busy} onClick={() => step(1)}>+</button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Fill in every available unit (the most you can check out)"
              disabled={busy || hwSet.available <= 0}
              onClick={() => setQty(String(hwSet.available))}
            >
              Max
            </button>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn" disabled={busy || offline || !qty.trim() || hwSet.available <= 0} title={offline ? OFFLINE_HINT : undefined}>Check Out</button>
          <button type="button" className="btn btn-ghost" disabled={busy || offline || !qty.trim()} title={offline ? OFFLINE_HINT : undefined} onClick={() => submit('in')}>Check In</button>
        </div>
      </form>

      {message && (
        <div className={`msg msg-${message.kind}`} style={{ marginTop: 12 }}>
          {message.kind === 'ok' ? '✓' : message.kind === 'warn' ? '!' : '✕'} {message.text}
        </div>
      )}
    </div>
  )
}
