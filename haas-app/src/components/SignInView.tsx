import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import { errorMessage } from '../errors.ts'
import { validateCreds } from '../validation.ts'
import NewUserModal from './NewUserModal.tsx'

interface Props {
  onSignedIn: (userID: string) => void
}

export default function SignInView({ onSignedIn }: Props) {
  const [userID, setUserID] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewUser, setShowNewUser] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      validateCreds(userID.trim(), password, 'signIn')
      const res = await api.login(userID.trim(), password)
      onSignedIn(res.userID ?? userID.trim())
    } catch (err) {
      setError(errorMessage(err, 'Sign in failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="loading-screen">
      <div className="loading-title">HAAS</div>
      <div className="section-desc">Hardware as a Service · Sign in to continue</div>

      <form className="form-panel signin-form" onSubmit={submit}>
        <div className="form-row">
          <label className="form-label" htmlFor="userid">User ID</label>
          <input
            id="userid"
            className="form-input"
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="msg msg-error">✕ {error}</div>}

        <button className="btn btn-block" disabled={busy || !userID.trim() || !password}>
          {busy ? '⏳  Signing in…' : '⇢  Sign In'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowNewUser(true)}>
          New User
        </button>
      </form>

      {showNewUser && (
        <NewUserModal
          onClose={() => setShowNewUser(false)}
          onCreated={(id) => {
            setShowNewUser(false)
            setUserID(id)
            setPassword('')
          }}
        />
      )}
    </div>
  )
}
