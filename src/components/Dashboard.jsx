import { useState, useEffect, useCallback } from 'react'
import { getItems, addItem, updateItem, deleteItem, recordMovement, getMovements, signOut } from '../lib/db'
import InventoryView, { status, fmtQty } from './InventoryView'
import LogView from './LogView'
import RecordModal from './RecordModal'
import StaffPanel from './StaffPanel'

function isToday(iso){ const d=new Date(iso), t=new Date(); return d.toDateString()===t.toDateString() }

export default function Dashboard({ profile }) {
  const [items, setItems] = useState([])
  const [movements, setMovements] = useState([])
  const [view, setView] = useState('inventory')
  const [modalItem, setModalItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [itemRows, moveRows] = await Promise.all([getItems(), getMovements()])
      setItems(itemRows)
      setMovements(moveRows)
    } catch (err) {
      setErrorMsg(err.message || 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function logMovement(item, type, delta, qtyAfter, note) {
    try {
      await recordMovement({
        shopId: profile.shop_id,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        type, delta, qtyAfter, note,
        createdBy: profile.id,
      })
    } catch (err) {
      setErrorMsg('Could not save the activity log entry: ' + err.message)
    }
  }

  async function handleQuickAdjust(item, direction, type) {
    const newQty = Math.max(0, +(item.qty + direction).toFixed(2))
    const delta = +(newQty - item.qty).toFixed(2)
    try {
      const updated = await updateItem(item.id, { qty: newQty })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      await logMovement(item, type, delta, newQty, '')
      loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleCorrection(item, newQty) {
    const delta = +(newQty - item.qty).toFixed(2)
    try {
      const updated = await updateItem(item.id, { qty: newQty })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      await logMovement(item, 'Correction', delta, newQty, 'Manual recount')
      loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleThresholdChange(item, newThreshold) {
    try {
      const updated = await updateItem(item.id, { threshold: newThreshold })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Remove "${item.name}" from the stock room?`)) return
    try {
      await logMovement(item, 'Removed', -item.qty, 0, 'Item deleted from stock room')
      await deleteItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleAddItem(fields) {
    try {
      const newItem = await addItem({ shopId: profile.shop_id, ...fields })
      setItems(prev => [...prev, newItem])
      await logMovement(newItem, 'Added', newItem.qty, newItem.qty, 'New item created')
      loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleModalSave({ type, amount, note }) {
    const item = modalItem
    const before = item.qty
    let newQty = before
    if (type === 'Restock') newQty = +(before + amount).toFixed(2)
    else if (type === 'Waste' || type === 'Used') newQty = Math.max(0, +(before - amount).toFixed(2))
    else if (type === 'Correction') newQty = +amount.toFixed(2)

    try {
      const updated = await updateItem(item.id, { qty: newQty })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      await logMovement(item, type, +(newQty - before).toFixed(2), newQty, note)
      setModalItem(null)
      loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  const low = items.filter(i => status(i) === 'low')
  const totalValue = items.reduce((s, i) => s + i.qty * i.cost, 0)
  const movesToday = movements.filter(m => isToday(m.created_at)).length

  return (
    <div>
      <header className="app-header">
        <div>
          <p className="shop-name display">Restock</p>
          <p className="shop-sub">Backroom inventory — beans, dairy, syrups &amp; paper goods</p>
        </div>
        <div className="header-right">
          <div className="who-am-i">{profile.full_name || profile.role}<br/>{profile.role}</div>
          <button className="btn-signout" onClick={signOut}>Log out</button>
        </div>
      </header>

      <div className="stats">
        <div className="stat"><div className="stat-num mono">{items.length}</div><div className="stat-label">items tracked</div></div>
        <div className="stat warn"><div className="stat-num mono">{low.length}</div><div className="stat-label">running low</div></div>
        <div className="stat"><div className="stat-num mono">${totalValue.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div className="stat-label">on hand, at cost</div></div>
        <div className="stat"><div className="stat-num mono">{movesToday}</div><div className="stat-label">movements today</div></div>
      </div>

      <div className="view-switch">
        <button className={`view-tab ${view==='inventory'?'active':''}`} onClick={()=>setView('inventory')}>Stock room</button>
        <button className={`view-tab ${view==='log'?'active':''}`} onClick={()=>setView('log')}>Activity log</button>
        {profile.role === 'owner' && (
          <button className={`view-tab ${view==='staff'?'active':''}`} onClick={()=>setView('staff')}>Staff</button>
        )}
      </div>

      <div className="layout">
        {view !== 'staff' && (
          <aside className="sidebar">
            <h2>Pinned — needs reorder</h2>
            {low.length === 0
              ? <div className="pin-empty">Nothing urgent. Stock looks healthy.</div>
              : low.map(i => (
                  <div className="pin" key={i.id}>
                    <div className="pin-name">{i.name}</div>
                    <div className="pin-detail">{fmtQty(i.qty)} / {fmtQty(i.threshold)} {i.unit}</div>
                  </div>
                ))
            }
          </aside>
        )}

        <main className="main">
          {errorMsg && <div className="auth-error" style={{marginBottom:16}}>{errorMsg}</div>}
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : view === 'inventory' ? (
            <InventoryView
              items={items}
              onQuickAdjust={handleQuickAdjust}
              onCorrection={handleCorrection}
              onThresholdChange={handleThresholdChange}
              onDelete={handleDelete}
              onOpenRecordModal={setModalItem}
              onAddItem={handleAddItem}
            />
          ) : view === 'staff' ? (
            <StaffPanel profile={profile} />
          ) : (
            <LogView movements={movements} />
          )}
        </main>
      </div>

      <footer className="app-footer">Stock levels and activity save automatically for {profile.role === 'owner' ? 'your shop' : 'the team'}.</footer>

      {modalItem && (
        <RecordModal item={modalItem} onClose={()=>setModalItem(null)} onSave={handleModalSave} />
      )}
    </div>
  )
}
