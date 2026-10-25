import { useEffect, useState } from 'react';
import { formatPrice } from '../productConflict.js';
import { formatQuantity } from '../units.js';

const money = (n) => `₹${n.toFixed(2)}`;

// Shown when a billing request names a product that exists more than once at different prices.
// Nothing is added for a request until the user picks one of its products; unpicked requests are skipped.
export default function ChooseProductModal({ requests, busy, onConfirm, onClose }) {
  // Chosen option index per request
  const [picks, setPicks] = useState({});

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const chosen = requests.flatMap((r, i) => (picks[i] == null ? [] : [r.options[picks[i]]]));
  const skipped = requests.length - chosen.length;

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="choose-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="choose-title">Which product did you mean?</h2>
        <p className="muted">These names match more than one product at different prices. Pick the right one to add it to the bill.</p>

        {requests.map((request, i) => (
          <fieldset key={i} className="choose-group">
            <legend>
              {request.name}
              <span className="muted"> · {request.quantity}{request.unit ? ` ${request.unit}` : ''} requested</span>
            </legend>
            {request.options.map((option, j) => (
              <label key={option.product_id} className={`choose-option${picks[i] === j ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name={`choose-${i}`}
                  checked={picks[i] === j}
                  onChange={() => setPicks((all) => ({ ...all, [i]: j }))}
                  disabled={busy}
                />
                <span className="choose-details">
                  <strong>{option.item_name}</strong>
                  <span className="muted">
                    ID {option.item_id}
                    {option.description && ` · ${option.description}`}
                  </span>
                </span>
                <span className="choose-price">
                  {formatPrice(option.price, option.unit)}
                  <span className="muted">{formatQuantity(option.quantity, option.unit)} = {money(option.amount)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ))}

        <div className="assistant-actions modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={() => onConfirm(chosen)} disabled={busy || chosen.length === 0}>
            {busy ? 'Adding…' : 'Add to bill'}
            {skipped > 0 && chosen.length > 0 && !busy ? ` (skip ${skipped})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
