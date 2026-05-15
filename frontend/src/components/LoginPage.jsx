import { useState } from 'react';
import api from '../lib/api';

export default function LoginPage({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!u || !p) return;
    setLoading(true);
    setErr('');
    try {
      const res = await api.post('/auth/login', { username: u, password: p });
      onLogin(res.data);
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Invalid username or password.');
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">⬡ CraftPanel</div>
        <div className="login-title">Admin Login</div>
        <div className="login-sub">Sign in to manage your Minecraft servers</div>
        {err && <div className="login-err">{err}</div>}
        <label className="login-label">Username</label>
        <input
          className="login-input"
          value={u}
          onChange={(e) => setU(e.target.value)}
          placeholder="admin"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="login-btn" onClick={submit} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
          Run <code style={{ color: 'var(--cyan)' }}>node setup.js</code> to create your account
        </div>
      </div>
    </div>
  );
}
