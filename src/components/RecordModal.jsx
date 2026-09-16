import { useState } from 'react'

export default function RecordModal({ item, onClose, onSave }) {
  const [type, setType] = useState('Restock')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const amountLabel =
    type === 'Waste' ? 'Amount to remove' :
    type === 'Restock' ? 'Amount to add' :
    type === 'Correction' ? 'New total quantity' : 'Amount used'

  function handleSave(){
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt < 0) return
    onSave({ type, amount: amt, note: note.trim() })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') onClose() }}>
      <div className="modal">
        <h3 className="display">Record a movement</h3>
        <div className="modal-sub">{item.name} — currently {item.qty} {item.unit} on hand</div>

        <label>Reason</label>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option>Restock</option><option>Waste</option><option>Correction</option><option>Used</option>
        </select>

        <label>{amountLabel}</label>
        <input type="number" step="0.1" min="0" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus />

        <label>Note (optional)</label>
        <input type="text" placeholder="e.g. delivery from Roastworks" value={note} onChange={e=>setNote(e.target.value)} />

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleSave}>Save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
