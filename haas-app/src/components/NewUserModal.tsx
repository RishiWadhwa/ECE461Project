import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'

interface Props {
  onClose: () => void
  onCreated: (userID: string) => void
}

export default function NewUserModal({ onClose, onCreated }: Props) {
  const [userID, setUserID] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.addUser(userID.trim(), password)
      onCreated(userID.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="card-title">NEW USER</div>

        <div className="form-row">
          <label className="form-label" htmlFor="new-userid">User ID</label>
          <input
            id="new-userid"
            className="form-input"
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="new-password">Password</label>
          <input
            id="new-password"
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="msg msg-error">✕ {error}</div>}

        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !userID.trim() || !password}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
