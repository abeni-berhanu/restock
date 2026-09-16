import { useState } from 'react'
import { signUp } from '../lib/db'

export default function SignupForm({ onSwitchToLogin }) {
  const [shopName, setShopName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signUp({ email, password, shopName, fullName })
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true)
      }
      // Otherwise onAuthStateChange in App.jsx picks up the new session automatically
    } catch (err) {
      setError(err.message || 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  if (needsConfirmation) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title display">Check your email</h1>
          <p className="auth-sub">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and log in.
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
        <h1 className="auth-title display">Set up Restock</h1>
        <p className="auth-sub">Create your shop and owner account.</p>

        <label htmlFor="signup-shop">Shop name</label>
        <input
          id="signup-shop" type="text" required value={shopName}
          onChange={e => setShopName(e.target.value)} placeholder="e.g. Corner Coffee Co."
        />

        <label htmlFor="signup-name">Your name</label>
        <input
          id="signup-name" type="text" required value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email" type="email" required value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email"
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password" type="password" required minLength={6} value={password}
          onChange={e => setPassword(e.target.value)} autoComplete="new-password"
        />

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating…' : 'Create shop'}
          </button>
        </div>

        <div className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin}>Log in</button>
        </div>
      </form>
    </div>
  )
}
