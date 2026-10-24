import { useEffect, useState } from 'react';
import { api } from '../api.js';
import BillModal, { formatDateTime } from '../components/BillModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadBillsZip } from '../billPdf.js';

export default function BillHistory() {
  const { token, user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api('/bills', { token })
      .then(({ bills }) => setBills(bills))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const downloadAll = async () => {
    setError('');
    setDownloading(true);
    try {
      await downloadBillsZip(bills, user);
    } catch (err) {
      console.error(err);
      setError('Could not create the download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="card inventory">
      <div className="bill-header">
        <h2>Billing History</h2>
        {bills.length > 0 && (
          <button className="secondary download-all" onClick={downloadAll} disabled={downloading}>
            {downloading ? 'Preparing zip…' : `Download all (${bills.length})`}
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Bill no.</th>
            <th>Description</th>
            <th>Total amount</th>
            <th>Date &amp; time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="empty-row">Loading…</td></tr>
          ) : bills.length === 0 ? (
            <tr><td colSpan={5} className="empty-row">No bills generated till now</td></tr>
          ) : (
            bills.map((b) => (
              <tr key={b._id}>
                <td>{b.bill_number}</td>
                <td className="description">{b.description}</td>
                <td>₹{b.total.toFixed(2)}</td>
                <td>{formatDateTime(b.issued_at)}</td>
                <td className="actions">
                  <button className="secondary" onClick={() => setViewing(b)}>View bill</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {viewing && <BillModal bill={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
