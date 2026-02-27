import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@stockflow.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div className="logo-icon" style={{ width: 44, height: 44, fontSize: 20 }}>SF</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>StockFlow</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>ERP SYSTEM</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Sign in to your account to continue
          </p>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div className="login-divider" />
        <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>DEMO CREDENTIALS</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>admin@stockflow.com / Admin@123</div>
        </div>
      </div>
    </div>
  );
}
