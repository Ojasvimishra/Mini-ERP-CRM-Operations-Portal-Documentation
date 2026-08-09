import React, { useState, useEffect } from 'react';
import { Users, Package, FileText, AlertTriangle } from 'lucide-react';
import type { User } from '../App';

interface DashboardProps {
  user: User;
  token: string;
  API_URL: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, token, API_URL }) => {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    challans: 0
  });
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch products, customers, challans in parallel
      const [resProducts, resCustomers, resChallans] = await Promise.all([
        fetch(`${API_URL}/products`, { headers }),
        fetch(`${API_URL}/customers`, { headers }).catch(() => null),
        fetch(`${API_URL}/challans`, { headers })
      ]);

      const products = resProducts.ok ? await resProducts.json() : [];
      const customersData = resCustomers && resCustomers.ok ? await resCustomers.json() : { customers: [] };
      const challans = resChallans.ok ? await resChallans.json() : [];

      const lowStockProducts = products.filter((p: any) => p.currentStock <= p.minStockAlertQty);

      setStats({
        products: products.length,
        customers: customersData.customers ? customersData.customers.length : 0,
        lowStock: lowStockProducts.length,
        challans: challans.length
      });

      setLowStockList(lowStockProducts);
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard analytics...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Metrics Cards */}
      <div className="grid-4">
        {/* Active Customers */}
        {(user.role === 'ADMIN' || user.role === 'SALES') && (
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Active Customers</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.customers}</h3>
            </div>
          </div>
        )}

        {/* Total Products */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-secondary)' }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Products</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.products}</h3>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: stats.lowStock > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: stats.lowStock > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: stats.lowStock > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Low Stock Items</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.lowStock > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{stats.lowStock}</h3>
          </div>
        </div>

        {/* Total Challans */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sales Challans</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.challans}</h3>
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts list */}
      <div className="glass" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="var(--accent-warning)" />
          <span>Critical Stock Warnings</span>
        </h3>
        
        {lowStockList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>All product inventory stock levels are healthy.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Product Name</th>
                  <th style={{ padding: '0.75rem 0' }}>SKU</th>
                  <th style={{ padding: '0.75rem 0' }}>Current Stock</th>
                  <th style={{ padding: '0.75rem 0' }}>Alert Threshold</th>
                  <th style={{ padding: '0.75rem 0' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{product.name}</td>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>{product.sku}</td>
                    <td style={{ padding: '0.75rem 0', color: 'var(--accent-danger)', fontWeight: 600 }}>{product.currentStock} units</td>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>{product.minStockAlertQty} units</td>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>{product.locationWarehouse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
