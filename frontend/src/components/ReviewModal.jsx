import { useEffect, useState } from 'react';
import { DeleteIcon, EditIcon } from './icons.jsx';
import PriceInput from './PriceInput.jsx';
import { perUnit } from '../units.js';
import { findConflict, formatPrice } from '../productConflict.js';

const isComplete = (item) => Boolean(item.item_name?.trim()) && item.price !== '' && item.price != null;

// Shows the products the assistant extracted. Any item can be edited or removed; missing fields must be filled in,
// and items already in `products` need the user to choose "Update price" or "Add separately".
// "Add" saves only the items that are complete and resolved.
export default function ReviewModal({ items: initialItems, products = [], busy, onAdd, onClose }) {
  const [items, setItems] = useState(() =>
    initialItems.map((item, i) => ({ ...item, key: i, editing: !item.item_name || item.price == null }))
  );

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const update = (key, field, value) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  const remove = (key) => setItems((list) => list.filter((item) => item.key !== key));

  const conflictOf = (item) => (isComplete(item) ? findConflict(products, item) : null);
  // `action` is the user's choice for a conflicting item; a stale choice (e.g. "update" after the price
  // was edited to match) doesn't count
  const resolved = (item) => {
    const conflict = conflictOf(item);
    if (!conflict) return true;
    return item.action === 'add_new' || (item.action === 'update' && conflict.code === 'PRICE_MISMATCH');
  };

  const ready = items.filter((item) => isComplete(item) && resolved(item));
  const skipped = items.length - ready.length;

  const add = () =>
    onAdd(
      ready.map((item) => {
        const conflict = conflictOf(item);
        return {
          item_name: item.item_name.trim(),
          description: item.description?.trim() ?? '',
          price: Number(item.price),
          unit: item.unit || 'pc',
          ...(conflict && { action: item.action, existing: conflict.existing }),
        };
      })
    );

  const conflictNotice = (item) => {
    const conflict = conflictOf(item);
    if (!conflict) return null;
    const mismatch = conflict.code === 'PRICE_MISMATCH';
    const choice = (action, label) => (
      <button
        type="button"
        className={item.action === action ? '' : 'secondary'}
        aria-pressed={item.action === action}
        onClick={() => update(item.key, 'action', item.action === action ? null : action)}
        disabled={busy}
      >
        {label}
      </button>
    );
    return (
      <div className="review-conflict">
        <div className="warning">
          {mismatch
            ? `Already in inventory at ${formatPrice(conflict.existing.price, conflict.existing.unit)}. You entered ${formatPrice(item.price, item.unit)}.`
            : `Already in inventory at ${formatPrice(item.price, item.unit)}.`}
          {!resolved(item) && ' Choose what to do, or it will be skipped.'}
        </div>
        <div className="review-buttons">
          {mismatch && choice('update', 'Update price')}
          {choice('add_new', 'Add separately')}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="review-title">Review products to add</h2>

        {items.length === 0 && <p className="muted">No items left to add.</p>}
        <ul className="review-list">
          {items.map((item) => (
            <li key={item.key} className={isComplete(item) ? '' : 'incomplete'}>
              {item.editing ? (
                <div className="review-edit">
                  <input
                    placeholder="Item name"
                    value={item.item_name ?? ''}
                    onChange={(e) => update(item.key, 'item_name', e.target.value)}
                  />
                  <input
                    placeholder="Description (optional)"
                    value={item.description ?? ''}
                    onChange={(e) => update(item.key, 'description', e.target.value)}
                  />
                  <PriceInput price={item.price} unit={item.unit} onChange={(e) => update(item.key, e.target.name, e.target.value)} />
                  <div className="review-buttons">
                    <button type="button" onClick={() => update(item.key, 'editing', false)} disabled={busy || !isComplete(item)}>
                      Done
                    </button>
                    <button type="button" className="danger icon-button" onClick={() => remove(item.key)} disabled={busy} title="Remove" aria-label="Remove item">
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="review-row">
                  <div>
                    <strong>{item.item_name}</strong>
                    {item.description && <div className="muted">{item.description}</div>}
                  </div>
                  <div className="review-price">₹{item.price}<span className="unit-tag">{perUnit(item.unit)}</span></div>
                  <div className="review-buttons">
                    <button type="button" className="secondary icon-button" onClick={() => update(item.key, 'editing', true)} disabled={busy} title="Edit" aria-label={`Edit ${item.item_name}`}>
                      <EditIcon />
                    </button>
                    <button type="button" className="danger icon-button" onClick={() => remove(item.key)} disabled={busy} title="Remove" aria-label={`Remove ${item.item_name}`}>
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              )}
              {!isComplete(item) && (
                <div className="review-hint">Fill in the name and price, or remove this item. Otherwise it will be skipped.</div>
              )}
              {!item.editing && conflictNotice(item)}
            </li>
          ))}
        </ul>

        <div className="assistant-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={add} disabled={busy || ready.length === 0}>
            {busy ? 'Adding…' : `Add ${ready.length} item${ready.length === 1 ? '' : 's'}`}
            {skipped > 0 && !busy ? ` (skip ${skipped})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
