import { useEffect } from 'react';

export default function ConfirmLogout({ onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="logout-title">Log out?</h2>
        <p className="muted">Any bill you haven't generated yet will be lost.</p>
        <div className="assistant-actions modal-actions">
          <button type="button" className="secondary" onClick={onClose} autoFocus>Cancel</button>
          <button type="button" className="danger" onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}
