import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import { errorMessage } from '../errors.ts'
import { passwordRules, userIDRules, validateCreds } from '../validation.ts'
import FieldHints from './FieldHints.tsx'
import { useHints } from '../useHints.ts'

interface Props {
  onClose: () => void
  // The account was created and the user is now signed in.
  onSignedIn: (userID: string) => void
  // The account was created but the automatic sign-in failed, so the user signs in by hand.
  onCreated: (userID: string) => void
}

export default function NewUserModal({ onClose, onSignedIn, onCreated }: Props) {
  const [userID, setUserID] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRules = userIDRules(userID.trim())
  const pwRules = passwordRules(password)
  const idHints = useHints(userID.trim(), idRules)
  const pwHints = useHints(password, pwRules)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const creds = validateCreds(userID.trim(), password, 'signUp')
      await api.addUser(creds)
      try {
        const res = await api.login(validateCreds(creds.userID, creds.password, 'signIn'))
        onSignedIn(res.userID ?? creds.userID)
      } catch {
        // The account exists now, so do not report an error: send them to Sign In with the userID filled in.
        onCreated(creds.userID)
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not create user'))
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
          <div>
            <input
              id="new-userid"
              className="form-input"
              value={userID}
              onChange={(e) => setUserID(e.target.value)}
              aria-describedby="new-userid-hints"
              autoFocus
              {...idHints.bind}
            />
            <FieldHints id="new-userid-hints" hints={idRules} open={idHints.open} />
          </div>
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="new-password">Password</label>
          <div>
            <input
              id="new-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="new-password-hints"
              {...pwHints.bind}
            />
            <FieldHints id="new-password-hints" hints={pwRules} open={pwHints.open} />
          </div>
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
