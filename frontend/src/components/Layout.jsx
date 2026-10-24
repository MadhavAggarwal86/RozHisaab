import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import AssistantPanel from './AssistantPanel.jsx';
import ConfirmLogout from './ConfirmLogout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { BillProvider } from '../context/BillContext.jsx';

const links = [
  { to: '/', label: 'Home', icon: '', end: true },
  { to: '/inventory', label: 'Inventory', icon: '' },
  { to: '/billing', label: 'Billing', icon: '' },
  { to: '/bill-history', label: 'Billing History', icon: '' },
];

const ASSISTANT_PATHS = ['/inventory', '/billing'];

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <BillProvider>
    <div className="dashboard">
      <header>
        <strong>{user.shopName}</strong>
        <div className="header-right">
          <span className="header-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="secondary logout" onClick={() => setConfirmingLogout(true)}>Log out</button>
        </div>
      </header>
      <div className="body">
        <aside className="sidebar">
          <nav>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
                <span aria-hidden="true">{l.icon}</span> {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <NavLink to="/profile" className="nav-link profile-link">
            <span className="avatar" aria-hidden="true">{user.ownerName.charAt(0).toUpperCase()}</span> Profile
            </NavLink>
          </div>
        </aside>
        <main>
          <Outlet />
        </main>
        {/* Kept mounted so the chat history survives switching tabs; just hidden elsewhere */}
        <div style={{ display: ASSISTANT_PATHS.includes(pathname) ? 'contents' : 'none' }}>
          <AssistantPanel />
        </div>
      </div>
      {confirmingLogout && <ConfirmLogout onConfirm={logout} onClose={() => setConfirmingLogout(false)} />}
    </div>
    </BillProvider>
  );
}
