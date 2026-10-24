import { useState } from 'react';
import { api } from '../api.js';
import { EditIcon } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FIELDS = [
  { name: 'shopName', label: 'Shop name', required: true },
  { name: 'ownerName', label: 'Owner name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'address', label: 'Shop address', multiline: true, placeholder: 'Shown on your bills', wide: true },
];

const toForm = (user) => Object.fromEntries(FIELDS.map((f) => [f.name, user[f.name] || '']));
const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' };

function DetailsCard() {
  const { user, token, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(user));
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const dirty = FIELDS.some((f) => form[f.name].trim() !== (user[f.name] || ''));

  const startEdit = () => {
    setForm(toForm(user));
    setError('');
    setSaved(false);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setCurrentPassword('');
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { user: updated } = await api('/auth/me', { method: 'PUT', body: { ...form, currentPassword }, token });
      setUser(updated);
      setEditing(false);
      setCurrentPassword('');
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <section className="card profile-card">
      <div className="profile-card-header">
        <div>
          <h2>Shop details</h2>
          <p className="muted">These appear on your bills.</p>
        </div>
        {!editing && (
          <button className="secondary with-icon" onClick={startEdit}><EditIcon /> Edit</button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {saved && !editing && <div className="success">Your changes have been saved.</div>}

      {editing ? (
        <form className="profile-form" onSubmit={save}>
          {FIELDS.map((f) => (
            <label key={f.name} className={f.wide ? 'wide' : ''}>
              <span>{f.label}{!f.required && <em> (optional)</em>}</span>
              {f.multiline ? (
                <textarea name={f.name} rows={2} value={form[f.name]} onChange={update} placeholder={f.placeholder} maxLength={300} />
              ) : (
                <input name={f.name} type={f.type || 'text'} value={form[f.name]} onChange={update} placeholder={f.placeholder} required={f.required} maxLength={100} />
              )}
            </label>
          ))}
          {emailChanged && (
            <label className="wide">
              <span>Current password <em>(needed to change your email)</em></span>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </label>
          )}
          <div className="profile-actions wide">
            <button type="button" className="secondary" onClick={cancel} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      ) : (
        <dl className="profile-details">
          {FIELDS.map((f) => (
            <div key={f.name} className={f.wide ? 'wide' : ''}>
              <dt>{f.label}</dt>
              <dd className={user[f.name] ? '' : 'muted'}>{user[f.name] || 'Not added'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function PasswordCard() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPasswords);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mismatch = form.confirmPassword && form.newPassword !== form.confirmPassword;

  const close = () => {
    setOpen(false);
    setForm(emptyPasswords);
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    setSaving(true);
    setError('');
    try {
      const { currentPassword, newPassword } = form;
      await api('/auth/password', { method: 'PUT', body: { currentPassword, newPassword }, token });
      close();
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <section className="card profile-card">
      <div className="profile-card-header">
        <div>
          <h2>Password</h2>
          <p className="muted">Use at least 8 characters with an uppercase letter, a number and a symbol.</p>
        </div>
        {!open && <button className="secondary" onClick={() => { setOpen(true); setDone(false); }}>Change password</button>}
      </div>

      {done && <div className="success">Your password has been changed.</div>}
      {error && <div className="error">{error}</div>}

      {open && (
        <form className="profile-form" onSubmit={save}>
          <label className="wide">
            <span>Current password</span>
            <input name="currentPassword" type="password" value={form.currentPassword} onChange={update} required autoComplete="current-password" />
          </label>
          <label>
            <span>New password</span>
            <input name="newPassword" type="password" value={form.newPassword} onChange={update} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            <span>Confirm new password</span>
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required autoComplete="new-password" />
            {mismatch && <small className="field-error">Passwords don't match</small>}
          </label>
          <div className="profile-actions wide">
            <button type="button" className="secondary" onClick={close} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving || mismatch}>{saving ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const since = new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="profile">
      <section className="card profile-hero">
        <div className="profile-avatar" aria-hidden="true">{user.shopName.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{user.shopName}</h1>
          <p className="muted">{user.ownerName} · {user.email}</p>
          <p className="muted small">Member since {since}</p>
        </div>
      </section>

      <DetailsCard />
      <PasswordCard />
    </div>
  );
}
