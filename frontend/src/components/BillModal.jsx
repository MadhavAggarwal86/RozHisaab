import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatQuantity, perUnit } from '../units.js';

const money = (n) => `₹${n.toFixed(2)}`;
export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// Shows one issued bill. Printing prints only the bill (see .print-area in index.css).
export default function BillModal({ bill, onClose }) {
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bill-title" onClick={(e) => e.stopPropagation()}>
        <div className="print-area bill-print">
          <div className="bill-head">
            <h1 id="bill-title">{user.shopName}</h1>
            {user.address && <p className="bill-shop-info">{user.address}</p>}
          </div>
          <div className="bill-meta">
            <span><span className="label">Bill No.</span> #{bill.bill_number}</span>
            <span><span className="label">Date</span> {formatDateTime(bill.issued_at)}</span>
          </div>
          <table className="bill-items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((i) => (
                <tr key={i.item_id}>
                  <td>{i.item_name}</td>
                  <td>{money(i.price)}<span className="unit-tag">{perUnit(i.unit)}</span></td>
                  <td>{formatQuantity(i.quantity, i.unit)}</td>
                  <td>{money(i.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bill-total">
                <td colSpan={3}>Grand Total</td>
                <td>{money(bill.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="assistant-actions modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Close</button>
          <button type="button" onClick={() => window.print()}>Print</button>
        </div>
      </div>
    </div>
  );
}
