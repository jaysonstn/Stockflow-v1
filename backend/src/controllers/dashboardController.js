const { query } = require('../database/db');
const logger = require('../utils/logger');

const getStats = async (req, res) => {
  try {
    const [
      totalProducts,
      lowStockProducts,
      totalOrders,
      revenueToday,
      revenueMonth,
      pendingOrders,
      topProducts,
      recentOrders,
      salesByStatus,
      stockAlerts,
      salesLast7Days
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM products WHERE is_active = true'),
      query('SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock_level AND is_active = true'),
      query('SELECT COUNT(*) FROM sales_orders'),
      query(`SELECT COALESCE(SUM(total),0) as revenue FROM sales_orders WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled'`),
      query(`SELECT COALESCE(SUM(total),0) as revenue FROM sales_orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status != 'cancelled'`),
      query(`SELECT COUNT(*) FROM sales_orders WHERE status = 'pending'`),
      query(`SELECT p.name, p.sku, SUM(soi.quantity) as sold, SUM(soi.total) as revenue
             FROM sales_order_items soi
             JOIN products p ON soi.product_id = p.id
             JOIN sales_orders so ON soi.order_id = so.id
             WHERE so.status != 'cancelled' AND so.created_at >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY p.id, p.name, p.sku
             ORDER BY sold DESC LIMIT 5`),
      query(`SELECT so.*, c.name as customer_name
             FROM sales_orders so
             LEFT JOIN customers c ON so.customer_id = c.id
             ORDER BY so.created_at DESC LIMIT 5`),
      query(`SELECT status, COUNT(*) as count, SUM(total) as total
             FROM sales_orders GROUP BY status`),
      query(`SELECT id, name, sku, stock_quantity, min_stock_level
             FROM products WHERE stock_quantity <= min_stock_level AND is_active = true
             ORDER BY stock_quantity ASC LIMIT 10`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
             FROM sales_orders
             WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status != 'cancelled'
             GROUP BY DATE(created_at) ORDER BY date ASC`)
    ]);

    res.json({
      totals: {
        products: parseInt(totalProducts.rows[0].count),
        lowStockProducts: parseInt(lowStockProducts.rows[0].count),
        orders: parseInt(totalOrders.rows[0].count),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
        revenueToday: parseFloat(revenueToday.rows[0].revenue),
        revenueMonth: parseFloat(revenueMonth.rows[0].revenue),
      },
      topProducts: topProducts.rows,
      recentOrders: recentOrders.rows,
      salesByStatus: salesByStatus.rows,
      stockAlerts: stockAlerts.rows,
      salesLast7Days: salesLast7Days.rows,
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getStats };
