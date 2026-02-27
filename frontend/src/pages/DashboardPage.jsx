import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api.js';
import { format, parseISO } from 'date-fns';

const fmtCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_COLORS = {
  pending: 'amber', confirmed: 'blue', processing: 'purple',
  shipped: 'blue', delivered: 'green', cancelled: 'red'
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state">Failed to load dashboard data.</div>;

  const { totals, topProducts, recentOrders, salesLast7Days, stockAlerts, salesByStatus } = data;

  const chartColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Monthly Revenue', value: fmtCurrency(totals.revenueMonth), icon: '💰', color: 'green' },
          { label: "Today's Revenue", value: fmtCurrency(totals.revenueToday), icon: '📈', color: 'blue' },
          { label: 'Total Orders', value: totals.orders, icon: '🛍️', color: 'purple' },
          { label: 'Pending Orders', value: totals.pendingOrders, icon: '⏳', color: 'amber' },
          { label: 'Products', value: totals.products, icon: '📦', color: 'blue' },
          { label: 'Low Stock Alerts', value: totals.lowStockProducts, icon: '⚠️', color: 'red' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Sales chart */}
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue — Last 7 Days</div></div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesLast7Days} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }}
                  tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }}
                />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#141927', border: '1px solid #1e2a3d', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [fmtCurrency(v), 'Revenue']}
                  labelFormatter={v => { try { return format(parseISO(v), 'dd/MM/yyyy'); } catch { return v; } }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by status */}
        <div className="card">
          <div className="card-header"><div className="card-title">Orders by Status</div></div>
          <div style={{ marginTop: 8 }}>
            {salesByStatus.map((s, i) => (
              <div key={s.status} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span className={`badge badge-${STATUS_COLORS[s.status] || 'gray'}`} style={{ width: 90, justifyContent: 'center' }}>
                  {s.status}
                </span>
                <div style={{ flex: 1, margin: '0 12px' }}>
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{
                        width: `${Math.min(100, (s.count / totals.orders) * 100)}%`,
                        background: chartColors[i % chartColors.length]
                      }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 28, textAlign: 'right' }}>{s.count}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80, textAlign: 'right' }}>{fmtCurrency(s.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent orders */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Orders</div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Order #</th><th>Customer</th><th>Total</th><th>Status</th>
              </tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="mono">{o.order_number}</td>
                    <td className="primary">{o.customer_name || 'Walk-in'}</td>
                    <td>{fmtCurrency(o.total)}</td>
                    <td><span className={`badge badge-${STATUS_COLORS[o.status] || 'gray'}`}>{o.status}</span></td>
                  </tr>
                ))}
                {!recentOrders.length && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Stock Alerts</div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr>
                <th>SKU</th><th>Product</th><th>Stock</th><th>Min</th>
              </tr></thead>
              <tbody>
                {stockAlerts.map(p => (
                  <tr key={p.id}>
                    <td className="mono">{p.sku}</td>
                    <td className="primary">{p.name}</td>
                    <td className={p.stock_quantity === 0 ? 'stock-critical' : 'stock-low'}>{p.stock_quantity}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.min_stock_level}</td>
                  </tr>
                ))}
                {!stockAlerts.length && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>✅ All stocks are healthy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
