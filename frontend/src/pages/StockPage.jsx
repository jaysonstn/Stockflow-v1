import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { format, parseISO } from 'date-fns';

const TYPE_BADGE = { in: 'green', out: 'red', adjustment: 'purple', return: 'blue' };
const TYPE_LABEL = { in: '↑ IN', out: '↓ OUT', adjustment: '⚙ ADJ', return: '↩ RET' };

export default function StockPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [allMovements, setAllMovements] = useState([]);

  useEffect(() => {
    api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data.data || []));
    // Load recent global movements by checking each product
    // Instead show product list with stock status
  }, []);

  useEffect(() => {
    if (!selectedProduct) { setMovements([]); return; }
    setLoading(true);
    api.get(`/products/${selectedProduct}/movements`).then(r => setMovements(r.data)).finally(() => setLoading(false));
  }, [selectedProduct]);

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);
  const outOfStock = products.filter(p => p.stock_quantity === 0);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Inventory</div><div className="page-subtitle">Stock levels and movements</div></div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon green">📦</div>
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">⚠️</div>
          <div className="stat-value">{lowStockProducts.length}</div>
          <div className="stat-label">Low Stock</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">🚫</div>
          <div className="stat-value">{outOfStock.length}</div>
          <div className="stat-label">Out of Stock</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Current Stock Levels */}
        <div className="card">
          <div className="card-header"><div className="card-title">Stock Levels</div></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Min</th><th>Status</th></tr></thead>
              <tbody>
                {products.map(p => {
                  const pct = Math.min(100, (p.stock_quantity / Math.max(p.max_stock_level, 1)) * 100);
                  const isOut = p.stock_quantity === 0;
                  const isLow = !isOut && p.stock_quantity <= p.min_stock_level;
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer', background: selectedProduct === p.id ? 'var(--bg-hover)' : '' }}
                      onClick={() => setSelectedProduct(p.id === selectedProduct ? '' : p.id)}>
                      <td className="primary" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td className="mono">{p.sku}</td>
                      <td className={isOut ? 'stock-critical' : isLow ? 'stock-low' : 'stock-ok'}>{p.stock_quantity}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.min_stock_level}</td>
                      <td>
                        <span className={`badge badge-${isOut ? 'red' : isLow ? 'amber' : 'green'}`}>
                          {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movement history */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {selectedProduct ? `Movement History — ${products.find(p => p.id === selectedProduct)?.name}` : 'Movement History'}
            </div>
          </div>
          {!selectedProduct ? (
            <div className="empty-state">
              <div className="empty-state-icon">👈</div>
              <div className="empty-state-text">Click a product to view its movement history</div>
            </div>
          ) : loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : movements.length === 0 ? (
            <div className="empty-state"><div className="empty-state-text">No movements found</div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>By</th><th>Date</th></tr></thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td><span className={`badge badge-${TYPE_BADGE[m.type] || 'gray'}`}>{TYPE_LABEL[m.type] || m.type}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.quantity}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.previous_quantity}</td>
                      <td style={{ fontWeight: 600 }}>{m.new_quantity}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.user_name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {m.created_at ? format(parseISO(m.created_at), 'dd/MM HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
