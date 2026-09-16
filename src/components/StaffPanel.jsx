import { useState, useEffect, useCallback } from 'react'
import { createInvite, getInvites, revokeInvite, getTeam } from '../lib/db'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from './Toast'

export default function StaffPanel({ profile }) {
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      const [teamRows, inviteRows] = await Promise.all([getTeam(), getInvites()])
      setTeam(teamRows)
      setInvites(inviteRows)
    } catch (err) {
      toast(err.message, 'error')
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      await createInvite({ shopId: profile.shop_id, email, invitedBy: profile.id })
      toast(`Invite created for ${email}`)
      setEmail('')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  async function confirmRevoke() {
    const inv = revokeTarget
    setRevokeTarget(null)
    try {
      await revokeInvite(inv.id)
      toast(`Invite to ${inv.email} revoked`)
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function inviteLink(id) {
    return `${window.location.origin}${window.location.pathname}?invite=${id}`
  }

  function copyLink(id) {
    navigator.clipboard.writeText(inviteLink(id))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const pending = invites.filter(i => !i.accepted_at)

  return (
    <div>
      <h2 style={{ fontFamily:'Fraunces, serif', fontSize:18, marginBottom:4 }}>Your team</h2>
      <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
        {team.length} {team.length === 1 ? 'person has' : 'people have'} access to this shop.
      </p>

      <div className="list-head" style={{ gridTemplateColumns: '1fr 100px 140px' }}>
        <div>Name</div><div>Role</div><div>Joined</div>
      </div>
      {team.map(t => (
        <div className="row" key={t.id} style={{ gridTemplateColumns: '1fr 100px 140px' }}>
          <div className="item-name">{t.full_name || '(no name set)'}</div>
          <div style={{ fontSize:13, textTransform:'capitalize' }}>{t.role}</div>
          <div className="mono" style={{ fontSize:12.5, color:'var(--muted)' }}>
            {new Date(t.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}

      <h2 style={{ fontFamily:'Fraunces, serif', fontSize:18, margin:'30px 0 4px' }}>Invite staff</h2>
      <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
        Enter their email, then copy the link and send it to them yourself — Restock doesn't email it for you yet.
      </p>

      <form onSubmit={handleInvite} style={{ display:'flex', gap:10, marginBottom: 20 }}>
        <input
          type="email" required placeholder="staff@example.com" value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{ flex:1, padding:'9px 10px', border:'1px solid var(--line)', fontSize:13.5 }}
        />
        <button className="btn-primary" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Create invite'}
        </button>
      </form>

      {pending.length === 0 ? (
        <div className="empty-state">No pending invites.</div>
      ) : (
        pending.map(inv => (
          <div className="pin" key={inv.id} style={{ transform:'none', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div>
              <div className="pin-name">{inv.email}</div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>
                Sent {new Date(inv.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="record-btn" onClick={()=>copyLink(inv.id)}>
                {copiedId === inv.id ? 'Copied!' : 'Copy link'}
              </button>
              <button className="del-btn" title="Revoke invite" onClick={()=>setRevokeTarget(inv)}>×</button>
            </div>
          </div>
        ))
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="Revoke this invite?"
          message={`${revokeTarget.email} won't be able to use this invite link anymore.`}
          confirmLabel="Revoke"
          danger
          onConfirm={confirmRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  )
}
