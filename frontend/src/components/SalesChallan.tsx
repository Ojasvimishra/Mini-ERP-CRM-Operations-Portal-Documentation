import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Download, FileText, CheckCircle, XCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { User } from '../App';

interface SalesChallanProps {
  user: User;
  token: string;
  API_URL: string;
}

const SalesChallan: React.FC<SalesChallanProps> = ({ user, token, API_URL }) => {
  const [challans, setChallans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);

  // New Challan Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [challanStatus, setChallanStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [challanItems, setChallanItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 }
  ]);

  useEffect(() => {
    fetchChallans();
    fetchCustomersAndProducts();
  }, []);

  const fetchChallans = async () => {
    try {
      const res = await fetch(`${API_URL}/challans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallans(data);
      }
    } catch (err) {
      console.error('Error loading challans', err);
    }
  };

  const fetchCustomersAndProducts = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resCust, resProd] = await Promise.all([
        fetch(`${API_URL}/customers?limit=100`, { headers }).catch(() => null),
        fetch(`${API_URL}/products`, { headers })
      ]);

      const custData = resCust && resCust.ok ? await resCust.json() : { customers: [] };
      const prodData = resProd.ok ? await resProd.json() : [];

      setCustomers(custData.customers || []);
      setProducts(prodData);
    } catch (err) {
      console.error('Error fetching customers/products', err);
    }
  };

  const handleOpenAdd = () => {
    setSelectedCustomerId('');
    setChallanStatus('DRAFT');
    setChallanItems([{ productId: '', quantity: 1 }]);
    setShowAddModal(true);
  };

  const handleAddItem = () => {
    setChallanItems([...challanItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const list = [...challanItems];
    list.splice(index, 1);
    setChallanItems(list);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const list = [...challanItems] as any;
    list[index][field] = value;
    setChallanItems(list);
  };

  const handleOpenDetails = async (challan: any) => {
    try {
      const res = await fetch(`${API_URL}/challans/${challan.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedChallan(data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching challan details', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entries
    const invalidItems = challanItems.some(i => !i.productId || i.quantity <= 0);
    if (invalidItems) {
      alert('Please fill out all product line items with valid quantities.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/challans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          status: challanStatus,
          items: challanItems,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchChallans();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create challan');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleConfirm = async (challanId: string) => {
    if (!window.confirm('Are you sure you want to CONFIRM this challan? Stock levels will be reduced.')) return;

    try {
      const res = await fetch(`${API_URL}/challans/${challanId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setShowDetailModal(false);
        fetchChallans();
      } else {
        const err = await res.json();
        alert(err.error || 'Confirmation failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleCancel = async (challanId: string) => {
    if (!window.confirm('Are you sure you want to CANCEL this challan? Stock will be restored if it was confirmed.')) return;

    try {
      const res = await fetch(`${API_URL}/challans/${challanId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setShowDetailModal(false);
        fetchChallans();
      } else {
        const err = await res.json();
        alert(err.error || 'Cancellation failed');
      }
    } catch {
      alert('Network error');
    }
  };

  // PDF Export logic (Using jsPDF)
  const exportPDF = (challan: any) => {
    try {
      console.log('exportPDF called with:', challan);
      console.log('Attempting to instantiate jsPDF...');
      const doc = new jsPDF();
      console.log('jsPDF instantiated successfully. doc:', doc);
      
      // Title & Header info
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('SALES CHALLAN & INVOICE', 14, 25);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Challan No: ${challan.challanNumber}`, 14, 35);
      doc.text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, 14, 40);
      doc.text(`Status: ${challan.status}`, 14, 45);

      // Bill To Customer section
      doc.setFont('Helvetica', 'bold');
      doc.text('BILL TO CLIENT:', 14, 60);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Name: ${challan.customer?.name || ''}`, 14, 65);
      doc.text(`Business: ${challan.customer?.businessName || ''}`, 14, 70);
      doc.text(`Address: ${challan.customer?.address || ''}`, 14, 75);
      if (challan.customer?.gstNumber) {
        doc.text(`GSTIN: ${challan.customer.gstNumber}`, 14, 80);
      }

      // Line items table
      let y = 95;
      doc.setFont('Helvetica', 'bold');
      doc.text('SKU', 14, y);
      doc.text('Product Name', 45, y);
      doc.text('Unit Price', 120, y);
      doc.text('Qty', 150, y);
      doc.text('Total', 170, y);
      
      doc.line(14, y + 2, 195, y + 2);
      doc.setFont('Helvetica', 'normal');
      
      let grandTotal = 0;
      let items = challan.productsSnapshot;
      console.log('Initial productsSnapshot:', items);
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
          console.log('Parsed productsSnapshot:', items);
        } catch (e) {
          console.error('Failed to parse productsSnapshot:', e);
        }
      }
      
      if (!Array.isArray(items)) {
        throw new Error('productsSnapshot is not an array');
      }

      items.forEach((item: any, idx: number) => {
        y += 10;
        const totalLine = item.unitPrice * item.quantity;
        grandTotal += totalLine;

        doc.text(item.sku || '', 14, y);
        doc.text((item.name || '').substring(0, 30), 45, y);
        doc.text(`INR ${Number(item.unitPrice || 0).toFixed(2)}`, 120, y);
        doc.text(String(item.quantity || 0), 150, y);
        doc.text(`INR ${totalLine.toFixed(2)}`, 170, y);
        console.log(`Added line item ${idx}:`, item);
      });

      y += 10;
      doc.line(14, y, 195, y);
      
      y += 10;
      doc.setFont('Helvetica', 'bold');
      doc.text('Grand Total:', 120, y);
      doc.text(`INR ${grandTotal.toFixed(2)}`, 170, y);

      // Save File
      console.log('Saving PDF file...');
      doc.save(`${challan.challanNumber}_Invoice.pdf`);
      console.log('PDF save method called successfully.');
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('PDF export failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search/Filter & Add New Challan */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {(user.role === 'ADMIN' || user.role === 'SALES') && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Sales Challan</span>
          </button>
        )}
      </div>

      {/* Challan List Table */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem' }}>Challan No.</th>
              <th style={{ padding: '0.75rem' }}>Customer Name</th>
              <th style={{ padding: '0.75rem' }}>Total Qty</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Created Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {challans.map(challan => (
              <tr key={challan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{challan.challanNumber}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: 500 }}>{challan.customer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{challan.customer.businessName}</div>
                </td>
                <td style={{ padding: '0.75rem' }}>{challan.totalQuantity} units</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: challan.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : challan.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: challan.status === 'CONFIRMED' ? 'var(--accent-success)' : challan.status === 'DRAFT' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                  }}>
                    {challan.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(challan.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenDetails(challan)}>
                      <Eye size={12} />
                      View Details
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => exportPDF(challan)}>
                      <Download size={12} />
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Challan Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '700px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Construct New Sales Challan</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2">
                <div>
                  <label>Select Customer</label>
                  <select required value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                    <option value="">-- Choose client --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.businessName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Challan State</label>
                  <select value={challanStatus} onChange={(e) => setChallanStatus(e.target.value as any)}>
                    <option value="DRAFT">DRAFT (Estimate)</option>
                    <option value="CONFIRMED">CONFIRMED (Reduces Stock)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Line items list */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span>Product Line Items</span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={handleAddItem}>
                    Add Line Item
                  </button>
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {challanItems.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ flex: 3 }}>
                        <select required value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}>
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku} | Price: ₹{Number(p.unitPrice).toFixed(2)} | Stock: {p.currentStock})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="number" required min="1" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))} />
                      </div>
                      {challanItems.length > 1 && (
                        <button type="button" className="btn btn-danger" style={{ padding: '0.75rem' }} onClick={() => handleRemoveItem(index)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Challan Details Modal */}
      {showDetailModal && selectedChallan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '650px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--accent-primary)" />
              <span>Challan: {selectedChallan.challanNumber}</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Created by: {selectedChallan.createdBy.name} on {new Date(selectedChallan.createdAt).toLocaleString()}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Customer Profile</p>
                <p><strong>Name:</strong> {selectedChallan.customer.name}</p>
                <p><strong>Business:</strong> {selectedChallan.customer.businessName}</p>
                <p><strong>Mobile:</strong> {selectedChallan.customer.mobileNumber}</p>
              </div>
              <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Document Status</p>
                <p><strong>Current Status:</strong> {selectedChallan.status}</p>
                <p><strong>Total Items:</strong> {selectedChallan.totalQuantity} units</p>
              </div>
            </div>

            {/* Snapshot Product table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Snapshot Product Line Items</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem 0' }}>SKU</th>
                    <th style={{ padding: '0.5rem 0' }}>Name</th>
                    <th style={{ padding: '0.5rem 0' }}>Price (INR)</th>
                    <th style={{ padding: '0.5rem 0' }}>Qty</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedChallan.productsSnapshot as any[]).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>{item.sku}</td>
                      <td style={{ padding: '0.5rem 0', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '0.5rem 0' }}>₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ padding: '0.5rem 0' }}>{item.quantity}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>₹{(item.unitPrice * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick action buttons depending on role */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedChallan.status === 'DRAFT' && (user.role === 'ADMIN' || user.role === 'SALES' || user.role === 'WAREHOUSE') && (
                  <button className="btn btn-success" onClick={() => handleConfirm(selectedChallan.id)}>
                    <CheckCircle size={14} />
                    Confirm Challan
                  </button>
                )}
                {selectedChallan.status !== 'CANCELLED' && (user.role === 'ADMIN' || user.role === 'SALES' || user.role === 'ACCOUNTS') && (
                  <button className="btn btn-danger" onClick={() => handleCancel(selectedChallan.id)}>
                    <XCircle size={14} />
                    Cancel Challan
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => exportPDF(selectedChallan)}>
                  <Download size={14} />
                  Export PDF
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChallan;
