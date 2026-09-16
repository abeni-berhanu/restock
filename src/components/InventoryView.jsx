import { useState } from 'react'

const CATEGORIES = ["All","Beans","Dairy","Syrups","Packaging","Other"]

function status(item){
  if(item.qty <= item.threshold) return "low"
  if(item.qty <= item.threshold * 1.5) return "watch"
  return "ok"
}
function fmtQty(n){ return Number.isInteger(n) ? n : (+n).toFixed(1) }

export default function InventoryView({ items, onQuickAdjust, onCorrection, onThresholdChange, onDelete, onOpenRecordModal, onAddItem }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name:'', category:'Beans', qty:'', unit:'', cost:'', threshold:'' })

  const visible = items.filter(i => activeCategory==="All" || i.category===activeCategory)

  function handleAdd(e){
    e.preventDefault()
    if(!form.name.trim()) return
    onAddItem({
      name: form.name.trim(),
      category: form.category,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit.trim() || 'ea',
      cost: parseFloat(form.cost) || 0,
      threshold: parseFloat(form.threshold) || 0,
    })
    setForm({ name:'', category:'Beans', qty:'', unit:'', cost:'', threshold:'' })
    setShowAddForm(false)
  }

  return (
    <div>
      <div className="tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`tab ${c===activeCategory?'active':''}`} onClick={()=>setActiveCategory(c)}>{c}</button>
        ))}
      </div>

      <div className="list-head">
        <div>Item</div><div>On hand</div><div>Unit cost</div><div>Reorder at</div><div></div><div></div>
      </div>

      {visible.length===0 ? (
        <div className="empty-state">No items in this category yet. Add one below.</div>
      ) : (
        visible.map(item => {
          const st = status(item)
          return (
            <div key={item.id} className={`row ${st==='low'?'low':st==='watch'?'watch':''}`}>
              <div className="item-name">
                {item.name}
                {st==='low' && <span className="item-tag tag-low">Low</span>}
                {st==='watch' && <span className="item-tag tag-watch">Watch</span>}
              </div>
              <div className="qty-control">
                <button className="qty-btn" onClick={()=>onQuickAdjust(item, -1, 'Used')}>–</button>
                <input
                  className="qty-input mono" type="number" step="0.1" defaultValue={item.qty}
                  key={item.qty}
                  onBlur={e=>{
                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                    if(val !== item.qty) onCorrection(item, val)
                  }}
                />
                <span className="unit-label">{item.unit}</span>
                <button className="qty-btn" onClick={()=>onQuickAdjust(item, 1, 'Restock')}>+</button>
              </div>
              <div className="cost mono">${Number(item.cost).toFixed(2)}</div>
              <div>
                <input
                  className="threshold-input mono" type="number" step="0.1" defaultValue={item.threshold}
                  key={'t'+item.threshold}
                  onBlur={e=>{
                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                    if(val !== item.threshold) onThresholdChange(item, val)
                  }}
                />
              </div>
              <div><button className="record-btn" onClick={()=>onOpenRecordModal(item)}>Record</button></div>
              <button className="del-btn" title="Remove item" onClick={()=>onDelete(item)}>×</button>
            </div>
          )
        })
      )}

      {!showAddForm ? (
        <button className="add-toggle" onClick={()=>setShowAddForm(true)}>+ Add an item to the stock room</button>
      ) : (
        <form className="add-form" onSubmit={handleAdd}>
          <input type="text" placeholder="Item name" value={form.name}
            onChange={e=>setForm({...form, name:e.target.value})} autoFocus />
          <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
            {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Qty" step="0.1" value={form.qty}
            onChange={e=>setForm({...form, qty:e.target.value})} />
          <input type="text" placeholder="Unit (kg, L, ea)" value={form.unit}
            onChange={e=>setForm({...form, unit:e.target.value})} />
          <input type="number" placeholder="Cost/unit" step="0.01" value={form.cost}
            onChange={e=>setForm({...form, cost:e.target.value})} />
          <input type="number" placeholder="Reorder at" step="0.1" value={form.threshold}
            onChange={e=>setForm({...form, threshold:e.target.value})} />
          <div className="add-form-actions">
            <button className="btn-primary" type="submit">Add item</button>
            <button className="btn-ghost" type="button" onClick={()=>setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

export { CATEGORIES, status, fmtQty }
