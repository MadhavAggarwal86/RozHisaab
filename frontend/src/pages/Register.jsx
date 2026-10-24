import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const initial = { shopName: '', ownerName: '', email: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(form.password)) return setError('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(form.password)) return setError('Password must contain at least one number');
    if (!/[^A-Za-z0-9]/.test(form.password)) return setError('Password must contain at least one special character');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>🛒 Register your shop</h1>
        <p className="subtitle">Create an account for your kirana store</p>

        {error && <div className="error">{error}</div>}

        <label>
          Shop name
          <input name="shopName" value={form.shopName} onChange={update} required autoFocus />
        </label>
        <label>
          Your name
          <input name="ownerName" value={form.ownerName} onChange={update} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={update} required minLength={8} />
        </label>
        <label>
          Confirm password
          <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} required />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>

        <p className="switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
