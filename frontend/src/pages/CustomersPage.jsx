import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const fmtCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(customer || { name: '', email: '', phone: '', address: '', tax_id: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (customer) await api.put(`/customers/${customer.id}`, form);
      else await api.post('/customers', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{customer ? 'Edit Customer' : 'New Customer'}</div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone || ''} onChange={set('phone')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">CPF/CNPJ</label>
            <input className="form-input" value={form.tax_id || ''} onChange={set('tax_id')} />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={form.address || ''} onChange={set('address')} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes || ''} onChange={set('notes')} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const LIMIT = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    api.get('/customers', { params }).then(r => { setCustomers(r.data.data); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Customers</div><div className="page-subtitle">{total} registered</div></div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>+ New Customer</button>
      </div>

      <div className="card">
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Search by name, email or phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30 }}>Loading...</td></tr>
              : customers.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No customers found</td></tr>
              : customers.map(c => (
                <tr key={c.id}>
                  <td className="primary">{c.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                  <td>{c.total_orders || 0}</td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{fmtCurrency(c.total_spent)}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => { setSelected(c); setShowModal(true); }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">{total} customers</div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {showModal && <CustomerModal customer={selected} onClose={() => { setShowModal(false); setSelected(null); }} onSaved={() => { setShowModal(false); setSelected(null); load(); }} />}
    </div>
  );
}
