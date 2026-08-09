import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react';
import type { User } from '../App';

interface CustomerCRMProps {
  user: User;
  token: string;
  API_URL: string;
}

const CustomerCRM: React.FC<CustomerCRMProps> = ({ user, token, API_URL }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Forms & Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL',
    address: '',
    status: 'LEAD',
    followUpDate: '',
    notes: '',
  });

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [search, type, status, page]);

  const fetchCustomers = async () => {
    try {
      const query = new URLSearchParams({
        search,
        type,
        status,
        page: String(page),
        limit: '10',
      }).toString();

      const res = await fetch(`${API_URL}/customers?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching customers', err);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      mobileNumber: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (customer: any) => {
    setIsEditing(true);
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType,
      address: customer.address,
      status: customer.status,
      followUpDate: customer.followUpDate ? customer.followUpDate.split('T')[0] : '',
      notes: customer.notes || '',
    });
    setShowAddModal(true);
  };

  const handleOpenDetails = async (customer: any) => {
    try {
      const res = await fetch(`${API_URL}/customers/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullCustomer = await res.json();
        setSelectedCustomer(fullCustomer);
        setNewNote('');
        setNextFollowUp('');
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching details', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/customers/${selectedCustomer.id}`
        : `${API_URL}/customers`;
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
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const res = await fetch(`${API_URL}/customers/${selectedCustomer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note: newNote,
          followUpDate: nextFollowUp || null,
        }),
      });

      if (res.ok) {
        await res.json();
        // Refresh details
        handleOpenDetails(selectedCustomer);
      } else {
        alert('Failed to add note');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters Bar & Create button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, business or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '160px' }}>
            <option value="">All Types</option>
            <option value="RETAIL">Retailer</option>
            <option value="WHOLESALE">Wholesaler</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '160px' }}>
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {user.role === 'ADMIN' || user.role === 'SALES' ? (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Customer</span>
          </button>
        ) : null}
      </div>

      {/* Customer Data Table */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem' }}>Name / Business</th>
              <th style={{ padding: '0.75rem' }}>Contact Info</th>
              <th style={{ padding: '0.75rem' }}>Type</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Follow-up Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600 }}>{customer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{customer.businessName}</div>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div>{customer.mobileNumber}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{customer.email}</div>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{customer.customerType}</span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: customer.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : customer.status === 'LEAD' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: customer.status === 'ACTIVE' ? 'var(--accent-success)' : customer.status === 'LEAD' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}>
                    {customer.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenDetails(customer)}>
                      <BookOpen size={12} />
                      Details
                    </button>
                    {(user.role === 'ADMIN' || user.role === 'SALES') && (
                      <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleOpenEdit(customer)}>
                        <Edit size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>
              Prev
            </button>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages))}>
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {isEditing ? 'Edit Customer Details' : 'Register New Customer'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2">
                <div>
                  <label>Customer Name</label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label>Business Name</label>
                  <input required value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Mobile Number</label>
                  <input required value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} />
                </div>
                <div>
                  <label>Email Address</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Customer Type</label>
                  <select value={formData.customerType} onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}>
                    <option value="RETAIL">Retailer</option>
                    <option value="WHOLESALE">Wholesaler</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div>
                  <label>GST Number (Optional)</label>
                  <input value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} />
                </div>
              </div>

              <div>
                <label>Address</label>
                <textarea required rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div className="grid-2">
                <div>
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label>Next Follow-up Date</label>
                  <input type="date" value={formData.followUpDate} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} />
                </div>
              </div>

              {!isEditing && (
                <div>
                  <label>Initial Onboarding Notes</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any specific requirements..." />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail & Follow-ups Modal */}
      {showDetailModal && selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: '750px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} color="var(--accent-primary)" />
              <span>CRM File: {selectedCustomer.name}</span>
            </h3>

            {/* Profile Detail block */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <p><strong>Business Name:</strong> {selectedCustomer.businessName}</p>
                <p><strong>Email:</strong> {selectedCustomer.email}</p>
                <p><strong>Mobile:</strong> {selectedCustomer.mobileNumber}</p>
                <p><strong>Address:</strong> {selectedCustomer.address}</p>
                {selectedCustomer.gstNumber && <p><strong>GSTIN:</strong> {selectedCustomer.gstNumber}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{selectedCustomer.status}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                  <div style={{ fontWeight: 600 }}>{selectedCustomer.customerType}</div>
                </div>
              </div>
            </div>

            {/* Activity History Logs & New Note Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Left Column: Follow up notes list */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Clock size={16} />
                  <span>Interaction History</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {selectedCustomer.followUpHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No logged entries yet.</p>
                  ) : (
                    selectedCustomer.followUpHistory.map((note: any) => (
                      <div key={note.id} className="glass" style={{ padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{note.note}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>By: {note.createdBy}</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Add Follow-up Note Form */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Calendar size={16} />
                  <span>Log Follow-up Call</span>
                </h4>
                <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label>Interaction Note</label>
                    <textarea required rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Summary of call/email discussion..." />
                  </div>
                  <div>
                    <label>Reschedule Next Follow-up (Optional)</label>
                    <input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <CheckCircle size={14} />
                    <span>Log Call & Update</span>
                  </button>
                </form>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
