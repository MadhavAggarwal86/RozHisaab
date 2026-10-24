import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import BillModal, { formatDateTime } from '../components/BillModal.jsx';
import SalesChart from '../components/SalesChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatQuantity } from '../units.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    api(`/bills/summary?since=${encodeURIComponent(startOfToday())}`, { token })
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [token]);

  const loading = !summary && !error;

  return (
    <div className="home">
      <section className="home-welcome">
        <h1>Namaste, {user.ownerName}!</h1>
        <p className="subtitle">Here's how your shop is doing today.</p>
      </section>

      {error && <div className="error">{error}</div>}

      <div className="home-top">
        <div className="home-main">
          <div className="stat-grid">
            <div className="stat-card">
              <span>Today's Sales</span>
              <strong>{loading ? '…' : `₹${(summary?.today_sales ?? 0).toFixed(2)}`}</strong>
            </div>
            <div className="stat-card">
              <span>Bills Today</span>
              <strong>{loading ? '…' : summary?.bills_today ?? 0}</strong>
            </div>
          </div>

          <div className="quick-actions">
            <button onClick={() => navigate('/billing')}>+ Create New Bill</button>
            <button className="secondary" onClick={() => navigate('/inventory')}>View Inventory</button>
          </div>
        </div>

        <section className="home-panel top-sellers">
          <h2>Top 5 best sellers</h2>
          {loading ? (
            <p className="empty-row">Loading…</p>
          ) : !summary?.best_sellers.length ? (
            <p className="empty-row">No sales yet</p>
          ) : (
            <ol className="best-sellers">
              {summary.best_sellers.map((p, i) => (
                <li key={p.item_id}>
                  <span className="rank">{i + 1}</span>
                  <div className="seller-info">
                    <div className="seller-row">
                      <span className="seller-name">{p.item_name}</span>
                      <strong>{formatQuantity(p.quantity, p.unit)}</strong>
                    </div>
                    <div className="seller-bar">
                      <div style={{ width: `${(p.quantity / summary.best_sellers[0].quantity) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="home-bottom">
        <SalesChart />

        <section className="home-panel recent-panel">
          <div className="bill-header">
            <h2>Recent transactions</h2>
            <Link to="/bill-history">View all</Link>
          </div>
          <div className="recent-bills">
            <table>
              <thead>
                <tr>
                  <th>Bill no.</th>
                  <th>Date &amp; time</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="empty-row">Loading…</td></tr>
                ) : !summary?.recent_bills.length ? (
                  <tr><td colSpan={3} className="empty-row">No bills generated till now</td></tr>
                ) : (
                  summary.recent_bills.map((b) => (
                    <tr key={b._id} className="clickable" onClick={() => setViewing(b)}>
                      <td>#{b.bill_number}</td>
                      <td>{formatDateTime(b.issued_at)}</td>
                      <td>₹{b.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {viewing && <BillModal bill={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
