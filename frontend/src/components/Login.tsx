import React, { useState } from 'react';

interface LoginProps {
  setToken: (token: string) => void;
  API_URL: string;
}

const Login: React.FC<LoginProps> = ({ setToken, API_URL }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
      } else {
        setError(data.error || 'Failed to login');
      }
    } catch {
      setError('Connection refused. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const autofillCredentials = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 10% 20%, rgb(19, 27, 46) 0.1%, rgb(11, 15, 25) 90.1%)'
    }}>
      <div className="glass fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Mini ERP Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Sign in to manage operations
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.75rem' }}>
            Quick Demo Logins (Password: password123)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => autofillCredentials('admin@example.com')}>
              Admin
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => autofillCredentials('sales@example.com')}>
              Sales
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => autofillCredentials('warehouse@example.com')}>
              Warehouse
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem' }} onClick={() => autofillCredentials('accounts@example.com')}>
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
