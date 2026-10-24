import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useBill } from '../context/BillContext.jsx';
import ReviewModal from './ReviewModal.jsx';

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
  // Products extracted from the last message, shown in the review modal until added or cancelled
  const [review, setReview] = useState(null);
  // Products saved by each "Add" from the assistant, newest last, so "undo" can remove them again
  const [addedBatches, setAddedBatches] = useState([]);

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
      const { items } = await api('/ai/inventory/parse', { method: 'POST', body: { message: command }, token });
      setReview(items);
      addInventoryEntry(command, `Found ${items.length} item${items.length === 1 ? '' : 's'}. Review them to add.`);
    } catch (err) {
      addInventoryEntry(command, err.message);
    } finally {
      setBusy(false);
    }
  };

  // Billing: the backend matches the message to item ids and quantities and returns the updated bill
  const sendBilling = async (command) => {
    const addBillingEntry = (status) => addEntry(command, status, '/billing');
    if (/^undo[.!]?$/i.test(command)) {
      return addBillingEntry(undoBill() ? 'Undid the last change to the bill.' : 'Nothing to undo.');
    }

    setBusy(true);
    try {
      const items = bill.items.map(({ item_id, quantity }) => ({ item_id, quantity }));
      const result = await api('/ai/billing/parse', { method: 'POST', body: { message: command, items }, token });
      if (!result.matched) return addBillingEntry("I couldn't find those products in your inventory.");
      setBill({ items: result.items, total: result.total });
      addBillingEntry(`Added ${result.matched} item${result.matched === 1 ? '' : 's'}. Total is ₹${result.total.toFixed(2)}.`);
    } catch (err) {
      addBillingEntry(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addItems = async (items) => {
    setBusy(true);
    const added = [];
    const failed = [];
    for (const item of items) {
      try {
        const { product } = await api('/products', { method: 'POST', body: item, token });
        added.push(product);
      } catch (err) {
        failed.push(`${item.item_name}: ${err.message}`);
      }
    }
    if (added.length) {
      addInventoryEntry('Added', `Added ${added.map((p) => p.item_name).join(', ')} to inventory.`);
      setAddedBatches((batches) => [...batches, added]);
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
    const failed = [];
    for (const product of batch) {
      try {
        await api(`/products/${product._id}`, { method: 'DELETE', token });
        removed.push(product.item_name);
      } catch (err) {
        // Already deleted by hand counts as undone
        if (/not found/i.test(err.message)) removed.push(product.item_name);
        else failed.push(`${product.item_name}: ${err.message}`);
      }
    }
    setAddedBatches((batches) => batches.slice(0, -1));
    window.dispatchEvent(new Event('products-changed'));
    addInventoryEntry(command, failed.length ? `Removed ${removed.join(', ') || 'nothing'}. Could not remove ${failed.join('; ')}` : `Removed ${removed.join(', ')}.`);
    setBusy(false);
  };

  const cancel = () => {
    addInventoryEntry('Cancelled', 'Nothing was saved.');
    setReview(null);
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

      {review && <ReviewModal items={review} busy={busy} onAdd={addItems} onClose={cancel} />}

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
