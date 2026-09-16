import { useState, useEffect } from 'react'
import { getInviteInfo, signUpWithInvite, signOut } from '../lib/db'

export default function InviteSignupForm({ inviteId, onSwitchToLogin }) {
  const [invite, setInvite] = useState(undefined) // undefined = loading, null = not found
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  useEffect(() => {
    getInviteInfo(inviteId)
      .then(setInvite)
      .catch(() => setInvite(null))
  }, [inviteId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signUpWithInvite({ email: invite.email, password, fullName, inviteId })
      if (result.needsEmailConfirmation) setNeedsEmailConfirmation(true)
    } catch (err) {
      setError(err.message || 'Could not join this shop.')
    } finally {
      setLoading(false)
    }
  }

  if (invite === undefined) {
    return <div className="center-loading">Checking your invite…</div>
  }

  if (invite === null) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title display">Invite not found</h1>
          <p className="auth-sub">This invite link doesn't look right. Ask your manager to send a new one.</p>
          <div className="auth-switch">
            <button type="button" onClick={onSwitchToLogin}>Back to login</button>
          </div>
        </div>
      </div>
    )
  }

  if (invite.accepted) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title display">Already used</h1>
          <p className="auth-sub">This invite has already been accepted. If that was you, just log in.</p>
          <div className="auth-switch">
            <button type="button" onClick={onSwitchToLogin}>Go to login</button>
          </div>
        </div>
      </div>
    )
  }

  if (needsEmailConfirmation) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title display">Check your email</h1>
          <p className="auth-sub">
            We sent a confirmation link to <strong>{invite.email}</strong>. Click it, then come back and log in.
          </p>
          <div className="auth-switch">
            <button type="button" onClick={onSwitchToLogin}>Back to login</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title display">Join {invite.shop_name}</h1>
        <p className="auth-sub">You've been invited to join as staff.</p>

        <label>Email</label>
        <input type="email" value={invite.email} disabled style={{ background: '#eee', color: '#666' }} />

        <label htmlFor="inv-name">Your name</label>
        <input id="inv-name" type="text" required value={fullName} onChange={e=>setFullName(e.target.value)} />

        <label htmlFor="inv-password">Choose a password</label>
        <input id="inv-password" type="password" required minLength={6} value={password}
          onChange={e=>setPassword(e.target.value)} autoComplete="new-password" />

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Joining…' : `Join ${invite.shop_name}`}
          </button>
        </div>

        <div className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={() => { signOut(); onSwitchToLogin() }}>Log in</button>
        </div>
      </form>
    </div>
  )
}
