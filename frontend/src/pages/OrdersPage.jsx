import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { format, parseISO } from 'date-fns';

const fmtCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const STATUS_BADGE = { pending: 'amber', confirmed: 'blue', processing: 'purple', shipped: 'blue', delivered: 'green', cancelled: 'red' };
const STATUS_LIST = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function NewOrderModal({ onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customer_id: '', items: [], discount: 0, tax: 0, notes: '' });
  const [searchProd, setSearchProd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || []));
    api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data || []));
  }, []);

  const filteredProducts = products.filter(p =>
    p.stock_quantity > 0 && (p.name.toLowerCase().includes(searchProd.toLowerCase()) || p.sku.toLowerCase().includes(searchProd.toLowerCase()))
  );

  const addItem = (product) => {
    setForm(f => {
      const existing = f.items.find(i => i.product_id === product.id);
      if (existing) {
        return { ...f, items: f.items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...f, items: [...f.items, { product_id: product.id, quantity: 1, discount: 0, product }] };
    });
  };

  const removeItem = (id) => setForm(f => ({ ...f, items: f.items.filter(i => i.product_id !== id) }));
  const updateQty = (id, qty) => setForm(f => ({
    ...f, items: f.items.map(i => i.product_id === id ? { ...i, quantity: Math.max(1, parseInt(qty) || 1) } : i)
  }));

  const subtotal = form.items.reduce((s, i) => s + (i.product.unit_price * i.quantity) - (i.discount || 0), 0);
  const total = subtotal - (form.discount || 0) + (form.tax || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.items.length) return setError('Add at least one item');
    setLoading(true); setError('');
    try {
      await api.post('/orders', { ...form, items: form.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, discount: i.discount })) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">New Sales Order</div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select className="form-select" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">-- Walk-in customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Add Products</label>
            <input className="form-input" placeholder="Search products by name or SKU..." value={searchProd} onChange={e => setSearchProd(e.target.value)} />
            {searchProd && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                {filteredProducts.slice(0, 8).map(p => (
                  <div key={p.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onClick={() => { addItem(p); setSearchProd(''); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span><strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.sku}</span></span>
                    <span style={{ color: 'var(--accent-green)' }}>{fmtCurrency(p.unit_price)} | Stock: {p.stock_quantity}</span>
                  </div>
                ))}
                {!filteredProducts.length && <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>No products found</div>}
              </div>
            )}
          </div>

          {form.items.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead><tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11 }}>Product</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11 }}>Unit Price</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11 }}>Total</th>
                  <th />
                </tr></thead>
                <tbody>
                  {form.items.map(i => (
                    <tr key={i.product_id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>{i.product.name}</td>
                      <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                        <input type="number" min="1" max={i.product.stock_quantity} value={i.quantity}
                          onChange={e => updateQty(i.product_id, e.target.value)}
                          style={{ width: 60, textAlign: 'center', padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtCurrency(i.product.unit_price)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(i.product.unit_price * i.quantity)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(i.product_id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmtCurrency(total)}</div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Discount (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tax (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Order notes..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.items.length}>
              {loading ? 'Creating...' : `Create Order ${form.items.length > 0 ? `(${fmtCurrency(total)})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const LIMIT = 15;

  const loadOrders = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (statusFilter) params.status = statusFilter;
    api.get('/orders', { params }).then(r => { setOrders(r.data.data); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    loadOrders();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sales Orders</div>
          <div className="page-subtitle">{total} orders total</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Order</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', ...STATUS_LIST].map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table>
            <thead><tr>
              <th>Order #</th><th>Customer</th><th>Items</th>
              <th>Total</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30 }}>Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td className="mono">{o.order_number}</td>
                  <td className="primary">{o.customer_name || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{o.items_count} item(s)</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{fmtCurrency(o.total)}</td>
                  <td><span className={`badge badge-${STATUS_BADGE[o.status] || 'gray'}`}>{o.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {o.created_at ? format(parseISO(o.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                  </td>
                  <td>
                    {o.status !== 'cancelled' && o.status !== 'delivered' && (
                      <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 130 }}
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}>
                        {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">{total} orders</div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {showModal && <NewOrderModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadOrders(); }} />}
    </div>
  );
}
