import { useState, useEffect, useRef } from 'react'
import { getSession, onAuthStateChange, getMyProfile, provisionShopFromMetadata } from './lib/db'
import LoginForm from './components/LoginForm'
import SignupForm from './components/SignupForm'
import InviteSignupForm from './components/InviteSignupForm'
import Dashboard from './components/Dashboard'
import CompleteSetupForm from './components/CompleteSetupForm'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = logged out
  const [profile, setProfile] = useState(null)
  const [authView, setAuthView] = useState('login')
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  // Read once on load: an invite link looks like yourapp.com/?invite=<id>
  const [inviteId, setInviteId] = useState(
    () => new URLSearchParams(window.location.search).get('invite')
  )

  useEffect(() => {
    getSession().then(setSession)
    const sub = onAuthStateChange((newSession) => setSession(newSession))
    return () => sub.unsubscribe()
  }, [])

  const lastUserIdRef = useRef(null)

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null

    // Supabase silently re-checks/refreshes the session every time the tab
    // regains focus. That fires onAuthStateChange even though it's still the
    // same person — without this guard, we'd needlessly reload the profile
    // (and flash the loading screen) every time someone tabs back in.
    if (currentUserId === lastUserIdRef.current) return
    lastUserIdRef.current = currentUserId

    if (!session) { setProfile(null); return }

    setCheckingProfile(true)
    setProfileError('')
    getMyProfile()
      .then(async (p) => {
        if (p) return p
        // No profile yet — most likely email confirmation delayed shop
        // creation. Try to finish it automatically using signup metadata.
        return await provisionShopFromMetadata()
      })
      .then(p => setProfile(p))
      .catch(err => setProfileError(err.message || 'Could not load your profile.'))
      .finally(() => setCheckingProfile(false))
  }, [session])

  // Still checking whether a session exists at all
  if (session === undefined) {
    return <div className="center-loading">Loading Restock…</div>
  }

  // Logged out — an invite link takes priority over the normal login/signup toggle
  if (!session) {
    if (inviteId) {
      return (
        <InviteSignupForm
          inviteId={inviteId}
          onSwitchToLogin={() => { setInviteId(null); setAuthView('login') }}
        />
      )
    }
    return authView === 'login'
      ? <LoginForm onSwitchToSignup={() => setAuthView('signup')} />
      : <SignupForm onSwitchToLogin={() => setAuthView('login')} />
  }

  // Logged in, but still fetching the profile row
  if (checkingProfile) {
    return <div className="center-loading">Loading your shop…</div>
  }

  if (profileError) {
    return (
      <div className="center-loading" style={{ flexDirection: 'column', gap: 12 }}>
        <div>Something went wrong: {profileError}</div>
      </div>
    )
  }

  if (!profile) {
    return <CompleteSetupForm onDone={setProfile} />
  }

  return <Dashboard profile={profile} />
}
