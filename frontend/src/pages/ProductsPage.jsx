import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const fmtCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function ProductModal({ product, categories, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState(product || {
    sku: '', name: '', description: '', category_id: '', supplier_id: '',
    unit_price: '', cost_price: '', stock_quantity: 0, min_stock_level: 5,
    max_stock_level: 1000, unit: 'un'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (product) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{product ? 'Edit Product' : 'New Product'}</div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input className="form-input" value={form.sku} onChange={set('sku')} required placeholder="PROD-001" disabled={!!product} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={set('unit')}>
                {['un', 'cx', 'kg', 'g', 'l', 'ml', 'm', 'resma', 'par'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={set('description')} rows={2} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id || ''} onChange={set('category_id')}>
                <option value="">-- None --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select className="form-select" value={form.supplier_id || ''} onChange={set('supplier_id')}>
                <option value="">-- None --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sale Price (R$) *</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.unit_price} onChange={set('unit_price')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Min Stock Level</label>
              <input className="form-input" type="number" min="0" value={form.min_stock_level} onChange={set('min_stock_level')} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Stock Level</label>
              <input className="form-input" type="number" min="0" value={form.max_stock_level} onChange={set('max_stock_level')} />
            </div>
          </div>
          {!product && (
            <div className="form-group">
              <label className="form-label">Initial Stock</label>
              <input className="form-input" type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} />
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'in', quantity: 1, notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post(`/products/${product.id}/stock`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Adjust Stock — {product.name}</div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Stock</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{product.stock_quantity} <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{product.unit}</span></div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Movement Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="in">📦 Incoming (Add)</option>
              <option value="out">📤 Outgoing (Remove)</option>
              <option value="adjustment">⚙️ Adjustment (Set exact value)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input className="form-input" type="number" min="0" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for adjustment..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Confirm Adjustment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [selected, setSelected] = useState(null);
  const LIMIT = 15;

  const loadProducts = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (lowStock) params.low_stock = true;
    api.get('/products', { params }).then(r => {
      setProducts(r.data.data); setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [page, search, lowStock]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
    api.get('/suppliers').then(r => setSuppliers(r.data));
  }, []);

  const handleSaved = () => { setShowModal(false); setShowStock(false); setSelected(null); loadProducts(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">{total} products registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>+ New Product</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className={`btn ${lowStock ? 'btn-danger' : 'btn-secondary'}`} onClick={() => { setLowStock(l => !l); setPage(1); }}>
            ⚠️ Low Stock {lowStock ? '(active)' : ''}
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr>
              <th>SKU</th><th>Product</th><th>Category</th>
              <th>Sale Price</th><th>Cost</th><th>Stock</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No products found</td></tr>
              ) : products.map(p => {
                const isLow = p.stock_quantity <= p.min_stock_level;
                const isOk = p.stock_quantity > p.min_stock_level;
                return (
                  <tr key={p.id}>
                    <td className="mono">{p.sku}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      {p.supplier_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.supplier_name}</div>}
                    </td>
                    <td>
                      {p.category_name
                        ? <span className="badge" style={{ background: `${p.category_color}22`, color: p.category_color }}>{p.category_name}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{fmtCurrency(p.unit_price)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtCurrency(p.cost_price)}</td>
                    <td>
                      <span className={isLow ? (p.stock_quantity === 0 ? 'stock-critical' : 'stock-low') : 'stock-ok'}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(p); setShowStock(true); }}>📦 Stock</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(p); setShowModal(true); }}>Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</div>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {showModal && (
        <ProductModal product={selected} categories={categories} suppliers={suppliers}
          onClose={() => { setShowModal(false); setSelected(null); }} onSaved={handleSaved} />
      )}
      {showStock && selected && (
        <StockModal product={selected} onClose={() => { setShowStock(false); setSelected(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
