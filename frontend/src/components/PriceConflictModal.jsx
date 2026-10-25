import { useEffect } from 'react';
import { formatPrice } from '../productConflict.js';

// Shown when a product being added (or renamed) already exists. Nothing is saved until the user picks an action.
// Without `onUpdate` there is no "Update price" option, e.g. when editing.
export default function PriceConflictModal({ conflict, item, busy, onUpdate, onAddNew, addNewLabel = 'Add as separate product', onClose }) {
  const { code, existing } = conflict;
  const mismatch = code === 'PRICE_MISMATCH';
  const newPrice = formatPrice(item.price, item.unit);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="conflict-title" aria-describedby="conflict-text" onClick={(e) => e.stopPropagation()}>
        <h2 id="conflict-title">{mismatch ? 'Price mismatch' : 'Product already exists'}</h2>
        <div className="warning" id="conflict-text">
          {mismatch
            ? `${existing.item_name} is already in your inventory at a different price.`
            : `${existing.item_name} is already in your inventory at ${newPrice}.`}
        </div>
        {mismatch && (
          <dl className="price-compare">
            <div>
              <dt>Existing price</dt>
              <dd>{formatPrice(existing.price, existing.unit)}</dd>
            </div>
            <div>
              <dt>New price</dt>
              <dd>{newPrice}</dd>
            </div>
          </dl>
        )}
        <div className="assistant-actions modal-actions conflict-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={busy} autoFocus>Cancel</button>
          <button type="button" className="secondary" onClick={onAddNew} disabled={busy}>{addNewLabel}</button>
          {mismatch && onUpdate && (
            <button type="button" onClick={onUpdate} disabled={busy}>{busy ? 'Saving…' : `Update price to ${newPrice}`}</button>
          )}
        </div>
      </div>
    </div>
  );
}
