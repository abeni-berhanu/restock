import { useState } from 'react'
import { signIn } from '../lib/db'

export default function LoginForm({ onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn({ email, password })
      // onAuthStateChange in App.jsx picks up the new session automatically
    } catch (err) {
      setError(err.message || 'Could not log in. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title display">Restock</h1>
        <p className="auth-sub">Log in to your stock room.</p>

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email" type="email" required value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email"
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password" type="password" required value={password}
          onChange={e => setPassword(e.target.value)} autoComplete="current-password"
        />

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </div>

        <div className="auth-switch">
          New shop?{' '}
          <button type="button" onClick={onSwitchToSignup}>Create one</button>
        </div>
      </form>
    </div>
  )
}
