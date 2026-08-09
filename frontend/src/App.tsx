import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CustomerCRM from './components/CustomerCRM';
import Inventory from './components/Inventory';
import SalesChallan from './components/SalesChallan';
import { ShieldCheck } from 'lucide-react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('crm_token'));
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Set backend api root
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (token) {
      localStorage.setItem('crm_token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('crm_token');
      setUser(null);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setToken(null);
      }
    } catch {
      setToken(null);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentView('dashboard');
  };

  if (!token || !user) {
    return <Login setToken={setToken} API_URL={API_URL} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <Sidebar 
        user={user} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Welcome back, {user.name}</p>
          </div>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '20px' }}>
            <ShieldCheck size={16} color="var(--accent-success)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.role}</span>
          </div>
        </header>

        <div className="fade-in">
          {currentView === 'dashboard' && <Dashboard user={user} token={token} API_URL={API_URL} />}
          {currentView === 'customers' && <CustomerCRM user={user} token={token} API_URL={API_URL} />}
          {currentView === 'products' && <Inventory user={user} token={token} API_URL={API_URL} />}
          {currentView === 'challans' && <SalesChallan user={user} token={token} API_URL={API_URL} />}
        </div>
      </main>
    </div>
  );
};

export default App;
