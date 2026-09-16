import { useState } from 'react'
import { completeShopSetup, signOut } from '../lib/db'

export default function CompleteSetupForm({ onDone }) {
  const [shopName, setShopName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await completeShopSetup({ shopName, fullName })
      onDone(profile)
    } catch (err) {
      setError(err.message || 'Could not finish setting up your shop.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title display">Almost there</h1>
        <p className="auth-sub">Your email's confirmed — let's finish setting up your shop.</p>

        <label htmlFor="cs-shop">Shop name</label>
        <input id="cs-shop" type="text" required value={shopName} onChange={e=>setShopName(e.target.value)} />

        <label htmlFor="cs-name">Your name</label>
        <input id="cs-name" type="text" required value={fullName} onChange={e=>setFullName(e.target.value)} />

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Setting up…' : 'Finish setup'}
          </button>
        </div>

        <div className="auth-switch">
          <button type="button" onClick={signOut}>Log out instead</button>
        </div>
      </form>
    </div>
  )
}
