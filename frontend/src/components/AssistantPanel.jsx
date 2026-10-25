import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useBill } from '../context/BillContext.jsx';
import ReviewModal from './ReviewModal.jsx';
import ChooseProductModal from './ChooseProductModal.jsx';
import { formatPrice, priceUpdateBody } from '../productConflict.js';

const AUTO_SEND_DELAY_MS = 900;

export default function AssistantPanel() {
  const { token } = useAuth();
  const { pathname } = useLocation();
  const { bill, setBill, undo: undoBill } = useBill();
  const [text, setText] = useState('');
  // Each tab keeps its own history, keyed by path
  const [histories, setHistories] = useState({});
  const history = histories[pathname] ?? [];
  const [busy, setBusy] = useState(false);
  // Products extracted from the last message, shown in the review modal until added or cancelled,
  // plus the current inventory so the modal can flag items that already exist
  const [review, setReview] = useState(null);
  // Changes saved by each "Add" from the assistant, newest last, so "undo" can revert them:
  // { product } for a new product, { product, previous } for an existing product whose price was updated
  const [addedBatches, setAddedBatches] = useState([]);
  // Billing requests that matched several same-name products at different prices, waiting for the user to pick
  const [choices, setChoices] = useState(null);

  const addEntry = (command, status, tab = pathname) =>
    setHistories((all) => ({ ...all, [tab]: [{ id: Date.now() + Math.random(), command, status }, ...(all[tab] ?? [])] }));
  // Inventory actions log to the Inventory history even if they finish after switching tabs
  const addInventoryEntry = (command, status) => addEntry(command, status, '/inventory');

  const send = async () => {
    const command = text.trim();
    if (!command || busy) return;
    setText('');

    if (pathname === '/billing') return sendBilling(command);
    if (pathname !== '/inventory') {
      return addEntry(command, 'The assistant only works on the Inventory and Billing tabs.');
    }

    // "undo" is handled locally; it never goes to the AI
    if (/^undo[.!]?$/i.test(command)) return undo(command);

    setBusy(true);
    try {
      const [{ items }, { products }] = await Promise.all([
        api('/ai/inventory/parse', { method: 'POST', body: { message: command }, token }),
        api('/products', { token }),
      ]);
      setReview({ items, products });
      addInventoryEntry(command, `Found ${items.length} item${items.length === 1 ? '' : 's'}. Review them to add.`);
    } catch (err) {
      addInventoryEntry(command, err.message);
    } finally {
      setBusy(false);
    }
  };

  // product_id lets the server check each line still points at the product that was picked
  const billLines = (items) => items.map(({ item_id, quantity, product_id }) => ({ item_id, quantity, product_id }));

  // Billing: the backend matches the message to item ids and quantities and returns the updated bill.
  // Names that match several products at different prices come back as `ambiguous` for the user to choose.
  const sendBilling = async (command) => {
    const addBillingEntry = (status) => addEntry(command, status, '/billing');
    if (/^undo[.!]?$/i.test(command)) {
      return addBillingEntry(undoBill() ? 'Undid the last change to the bill.' : 'Nothing to undo.');
    }

    setBusy(true);
    try {
      const result = await api('/ai/billing/parse', { method: 'POST', body: { message: command, items: billLines(bill.items) }, token });
      const ambiguous = result.ambiguous ?? [];
      if (!result.matched && !ambiguous.length) return addBillingEntry("I couldn't find those products in your inventory.");
      if (result.matched) setBill({ items: result.items, total: result.total });
      if (ambiguous.length) setChoices(ambiguous);

      const choose = ambiguous.length ? ` Choose which ${[...new Set(ambiguous.map((a) => a.name))].join(', ')} to add.` : '';
      addBillingEntry(
        result.matched
          ? `Added ${result.matched} item${result.matched === 1 ? '' : 's'}. Total is ₹${result.total.toFixed(2)}.${choose}`
          : choose.trim()
      );
    } catch (err) {
      addBillingEntry(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addItems = async (items) => {
    setBusy(true);
    const changes = [];
    const failed = [];
    for (const { action, existing, ...item } of items) {
      try {
        if (action === 'update') {
          const { product } = await api(`/products/${existing._id}`, { method: 'PUT', body: priceUpdateBody(existing, item), token });
          changes.push({ product, previous: existing });
        } else {
          const body = action === 'add_new' ? { ...item, allow_duplicate: true } : item;
          const { product } = await api('/products', { method: 'POST', body, token });
          changes.push({ product });
        }
      } catch (err) {
        failed.push(`${item.item_name}: ${err.message}`);
      }
    }
    if (changes.length) {
      const names = (list) => list.map((c) => c.product.item_name).join(', ');
      const added = changes.filter((c) => !c.previous);
      const updated = changes.filter((c) => c.previous);
      const summary = [
        added.length && `Added ${names(added)} to inventory.`,
        updated.length && `Updated the price of ${names(updated)}.`,
      ].filter(Boolean).join(' ');
      addInventoryEntry('Added', summary);
      setAddedBatches((batches) => [...batches, changes]);
      window.dispatchEvent(new Event('products-changed'));
    }
    if (failed.length) addInventoryEntry('Not added', failed.join('; '));
    setReview(null);
    setBusy(false);
  };

  const undo = async (command) => {
    const batch = addedBatches.at(-1);
    if (!batch) return addInventoryEntry(command, 'Nothing to undo.');

    setBusy(true);
    const removed = [];
    const restored = [];
    const failed = [];
    for (const { product, previous } of batch) {
      try {
        if (previous) {
          const { item_name, description, price, unit } = previous;
          await api(`/products/${product._id}`, { method: 'PUT', body: { item_name, description, price, unit }, token });
          restored.push(product.item_name);
        } else {
          await api(`/products/${product._id}`, { method: 'DELETE', token });
          removed.push(product.item_name);
        }
      } catch (err) {
        // Already deleted by hand counts as undone
        if (!previous && /not found/i.test(err.message)) removed.push(product.item_name);
        else failed.push(`${product.item_name}: ${err.message}`);
      }
    }
    setAddedBatches((batches) => batches.slice(0, -1));
    window.dispatchEvent(new Event('products-changed'));
    const done = [
      (removed.length || !restored.length) && `Removed ${removed.join(', ') || 'nothing'}.`,
      restored.length && `Restored the old price of ${restored.join(', ')}.`,
    ].filter(Boolean).join(' ');
    addInventoryEntry(command, failed.length ? `${done} Could not undo ${failed.join('; ')}` : done);
    setBusy(false);
  };

  const cancel = () => {
    addInventoryEntry('Cancelled', 'Nothing was saved.');
    setReview(null);
  };

  // Adds the products picked in the chooser; the server prices them along with the rest of the bill
  const addChosen = async (picked) => {
    setBusy(true);
    try {
      const result = await api('/bills/preview', { method: 'POST', body: { items: billLines([...bill.items, ...picked]) }, token });
      setBill(result);
      const names = picked.map((p) => `${p.item_name} (${formatPrice(p.price, p.unit)})`).join(', ');
      addEntry('Chosen', `Added ${names}. Total is ₹${result.total.toFixed(2)}.`, '/billing');
      setChoices(null);
    } catch (err) {
      addEntry('Chosen', err.message, '/billing');
    } finally {
      setBusy(false);
    }
  };

  const cancelChoice = () => {
    addEntry('Cancelled', 'Nothing more was added to the bill.', '/billing');
    setChoices(null);
  };

  const submit = (e) => {
    e.preventDefault();
    send();
  };

  // Auto-send once the user has stopped typing for 900 ms
  useEffect(() => {
    if (!text.trim()) return;
    const timer = setTimeout(send, AUTO_SEND_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <aside className="assistant">
      <h2>Assistant</h2>
      <form onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={pathname === '/billing' ? 'e.g. 2 basmati rice, 1 amul butter' : 'e.g. add Basmati rice, 90 rupees'}
        />
        <div className="assistant-actions">
          <button type="submit" disabled={!text.trim() || busy}>{busy ? 'Thinking…' : 'Send'}</button>
        </div>
      </form>

      {choices && <ChooseProductModal requests={choices} busy={busy} onConfirm={addChosen} onClose={cancelChoice} />}
      {review && <ReviewModal items={review.items} products={review.products} busy={busy} onAdd={addItems} onClose={cancel} />}

      <h3>History</h3>
      <ul className="assistant-history">
        {history.length === 0 && <li className="empty">Nothing yet.</li>}
        {history.map((h) => (
          <li key={h.id}>
            <div className="command">{h.command}</div>
            <div className="status">{h.status}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
