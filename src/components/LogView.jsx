import { useState, useMemo } from 'react'
import { CATEGORIES, fmtQty } from './InventoryView'

function isToday(iso){ const d=new Date(iso), t=new Date(); return d.toDateString()===t.toDateString() }

export default function LogView({ movements }) {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [type, setType] = useState('All')
  const [range, setRange] = useState('all')

  const filtered = useMemo(() => {
    return movements.filter(m => {
      if (search && !m.item_name.toLowerCase().includes(search.toLowerCase())) return false
      if (cat !== 'All' && m.category !== cat) return false
      if (type !== 'All' && m.type !== type) return false
      if (range === 'today' && !isToday(m.created_at)) return false
      if (range === '7' || range === '30') {
        const days = parseInt(range)
        const cutoff = Date.now() - days*24*60*60*1000
        if (new Date(m.created_at).getTime() < cutoff) return false
      }
      return true
    })
  }, [movements, search, cat, type, range])

  const groups = useMemo(() => {
    const g = {}
    filtered.forEach(m => {
      const key = new Date(m.created_at).toDateString()
      ;(g[key] = g[key] || []).push(m)
    })
    return g
  }, [filtered])

  return (
    <div>
      <div className="log-filters">
        <input type="text" placeholder="Search item…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="All">All categories</option>
          {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="All">All reasons</option>
          <option>Restock</option><option>Used</option><option>Waste</option>
          <option>Correction</option><option>Added</option><option>Removed</option>
        </select>
        <select value={range} onChange={e=>setRange(e.target.value)}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No activity matches these filters yet.</div>
      ) : (
        Object.entries(groups).map(([dayKey, list]) => {
          const label = isToday(list[0].created_at)
            ? "Today"
            : new Date(dayKey).toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' })
          return (
            <div className="day-group" key={dayKey}>
              <div className="day-heading">{label}</div>
              {list.map(m => {
                const deltaClass = m.delta > 0 ? 'pos' : m.delta < 0 ? 'neg' : ''
                const deltaStr = m.delta > 0 ? `+${fmtQty(m.delta)}` : fmtQty(m.delta)
                const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })
                return (
                  <div className="log-row" key={m.id}>
                    <div className="log-time mono">{time}</div>
                    <div><span className="log-item">{m.item_name}</span> <span className="log-cat">· {m.category}</span></div>
                    <div><span className={`log-type type-${m.type}`}>{m.type}</span></div>
                    <div className={`log-delta mono ${deltaClass}`}>{deltaStr}</div>
                    <div className="log-note">{m.note}</div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
