import { useState } from 'react';
import { api } from '../api.js';
import BillModal from '../components/BillModal.jsx';
import { DeleteIcon } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBill } from '../context/BillContext.jsx';
import { formatQuantity, perUnit } from '../units.js';

const money = (n) => `₹${n.toFixed(2)}`;

export default function Billing() {
  const { token } = useAuth();
  const { bill, removeItem, clear, reset } = useBill();
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // The bill just issued, shown so it can be printed straight away
  const [issued, setIssued] = useState(null);

  const generate = async () => {
    setSaving(true);
    setError('');
    try {
      const items = bill.items.map(({ item_id, quantity }) => ({ item_id, quantity }));
      const result = await api('/bills', { method: 'POST', body: { items, description }, token });
      setIssued(result.bill);
      setDescription('');
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card inventory">
      <div className="bill-header">
        <h2>Billing</h2>
        {bill.items.length > 0 && <button className="secondary" onClick={clear}>New bill</button>}
      </div>
      {error && <div className="error">{error}</div>}

      {bill.items.length === 0 ? (
        <p className="muted">No items yet. Tell the assistant what the customer is buying, e.g. "2 basmati rice, 1 amul butter and 250gm sugar".</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((i) => (
              <tr key={i.item_id}>
                <td>{i.item_id}</td>
                <td>{i.item_name}</td>
                <td>{money(i.price)}<span className="unit-tag">{perUnit(i.unit)}</span></td>
                <td>{formatQuantity(i.quantity, i.unit)}</td>
                <td>{money(i.amount)}</td>
                <td className="actions">
                  <button className="danger icon-button" onClick={() => removeItem(i.item_id)} title="Remove" aria-label={`Remove ${i.item_name}`}>
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bill-total">
              <td colSpan={4}>Total</td>
              <td>{money(bill.total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}

      {bill.items.length > 0 && (
        <div className="bill-generate">
          <input
            placeholder="Description (optional, e.g. customer name)"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button onClick={generate} disabled={saving}>{saving ? 'Generating…' : 'Generate bill'}</button>
        </div>
      )}

      {issued && <BillModal bill={issued} onClose={() => setIssued(null)} />}
    </section>
  );
}
