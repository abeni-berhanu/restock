export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') onCancel() }}>
      <div className="modal">
        <h3 className="display">{title}</h3>
        <div className="modal-sub">{message}</div>
        <div className="modal-actions">
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
