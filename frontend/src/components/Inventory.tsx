import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, RefreshCw, Eye, AlertTriangle } from 'lucide-react';
import type { User } from '../App';

interface InventoryProps {
  user: User;
  token: string;
  API_URL: string;
}

const Inventory: React.FC<InventoryProps> = ({ user, token, API_URL }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlertQty: 0,
    locationWarehouse: '',
    imageUrl: '',
  });

  // Stock Adjustment States
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('');

  // Logs States
  const [movementLogs, setMovementLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [search, lowStock]);

  const fetchProducts = async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (lowStock) query.append('lowStock', 'true');

      const res = await fetch(`${API_URL}/products?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error loading inventory products', err);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlertQty: 0,
      locationWarehouse: '',
      imageUrl: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (product: any) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: Number(product.unitPrice),
      currentStock: product.currentStock,
      minStockAlertQty: product.minStockAlertQty,
      locationWarehouse: product.locationWarehouse,
      imageUrl: product.imageUrl || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (product: any) => {
    setSelectedProduct(product);
    setAdjustQty(0);
    setAdjustType('IN');
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  const handleOpenLogs = async (product: any) => {
    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedProduct(data);
        setMovementLogs(data.stockMovements);
        setShowLogsModal(true);
      }
    } catch (err) {
      console.error('Error fetching movement history logs', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/products/${selectedProduct.id}`
        : `${API_URL}/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save product');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const res = await fetch(`${API_URL}/products/${selectedProduct.id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: adjustQty,
          movementType: adjustType,
          reason: adjustReason,
        }),
      });

      if (res.ok) {
        setShowAdjustModal(false);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || 'Adjustment failed');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ 
              background: lowStock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
              color: lowStock ? 'var(--accent-warning)' : 'var(--text-primary)',
              border: lowStock ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)'
            }}
            onClick={() => setLowStock(!lowStock)}
          >
            <AlertTriangle size={14} />
            <span>Low Stock Alerts</span>
          </button>
        </div>

        {user.role === 'ADMIN' || user.role === 'WAREHOUSE' ? (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        ) : null}
      </div>

      {/* Products Data Table */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem' }}>Product & SKU</th>
              <th style={{ padding: '0.75rem' }}>Category</th>
              <th style={{ padding: '0.75rem' }}>Price</th>
              <th style={{ padding: '0.75rem' }}>Stock Level</th>
              <th style={{ padding: '0.75rem' }}>Warehouse Bin</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const isLowStock = product.currentStock <= product.minStockAlertQty;
              return (
                <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{product.sku}</div>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{product.category}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{Number(product.unitPrice).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: isLowStock ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
                      {product.currentStock} units
                    </span>
                    {isLowStock && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', color: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                        Low Stock Alert
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{product.locationWarehouse}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenLogs(product)}>
                        <Eye size={12} />
                        Logs
                      </button>
                      {(user.role === 'ADMIN' || user.role === 'WAREHOUSE') && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenAdjust(product)}>
                            <RefreshCw size={12} />
                            Adjust
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenEdit(product)}>
                            <Edit size={12} />
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '550px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {isEditing ? 'Modify Product Specifications' : 'Catalog New Product'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2">
                <div>
                  <label>Product Name</label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label>SKU Code</label>
                  <input required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Category</label>
                  <input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Electronics, Furniture" />
                </div>
                <div>
                  <label>Unit Price (₹)</label>
                  <input type="number" step="0.01" required value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Minimum Stock Alert Level</label>
                  <input type="number" required value={formData.minStockAlertQty} onChange={(e) => setFormData({ ...formData, minStockAlertQty: parseInt(e.target.value, 10) })} />
                </div>
                <div>
                  <label>Warehouse Storage Bin</label>
                  <input required value={formData.locationWarehouse} onChange={(e) => setFormData({ ...formData, locationWarehouse: e.target.value })} placeholder="e.g. Aisle C-3" />
                </div>
              </div>

              {!isEditing && (
                <div>
                  <label>Initial Opening Stock</label>
                  <input type="number" required value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) })} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Update Details' : 'Add to Catalog'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjust Modal */}
      {showAdjustModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Manual Stock Correction</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Product: <strong>{selectedProduct.name}</strong> (Stock: {selectedProduct.currentStock})
            </p>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2">
                <div>
                  <label>Movement Type</label>
                  <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT')}>
                    <option value="IN">IN (Add Stock)</option>
                    <option value="OUT">OUT (Remove Stock)</option>
                  </select>
                </div>
                <div>
                  <label>Quantity</label>
                  <input type="number" required min="1" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value, 10))} />
                </div>
              </div>

              <div>
                <label>Reason for adjustment</label>
                <input required value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Audit correction, damaged goods return" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Correction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock movement log history Modal */}
      {showLogsModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '650px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Inventory Movement History</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Track log for SKU: <strong>{selectedProduct.sku}</strong> ({selectedProduct.name})
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.5rem' }}>Type</th>
                  <th style={{ padding: '0.5rem' }}>Authorized By</th>
                  <th style={{ padding: '0.5rem' }}>Reason Log</th>
                </tr>
              </thead>
              <tbody>
                {movementLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No history logged yet.
                    </td>
                  </tr>
                ) : (
                  movementLogs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{log.quantity} units</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{
                          fontWeight: 600,
                          color: log.movementType === 'IN' ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}>
                          {log.movementType}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                        {log.createdBy.name} ({log.createdBy.role})
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{log.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogsModal(false)}>Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
