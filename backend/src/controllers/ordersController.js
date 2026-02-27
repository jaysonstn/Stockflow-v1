const { query, getClient } = require('../database/db');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

const getAll = async (req, res) => {
  try {
    const { status, customer_id, page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    let pc = 0;

    if (status) { pc++; where += ` AND so.status = $${pc}`; params.push(status); }
    if (customer_id) { pc++; where += ` AND so.customer_id = $${pc}`; params.push(customer_id); }
    if (start_date) { pc++; where += ` AND so.created_at >= $${pc}`; params.push(start_date); }
    if (end_date) { pc++; where += ` AND so.created_at <= $${pc}`; params.push(end_date); }

    const countResult = await query(`SELECT COUNT(*) FROM sales_orders so ${where}`, params);

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT so.*, c.name as customer_name, u.name as seller_name,
              (SELECT COUNT(*) FROM sales_order_items WHERE order_id = so.id) as items_count
       FROM sales_orders so
       LEFT JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON so.user_id = u.id
       ${where}
       ORDER BY so.created_at DESC
       LIMIT $${pc + 1} OFFSET $${pc + 2}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Get orders error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOne = async (req, res) => {
  try {
    const orderResult = await query(
      `SELECT so.*, c.name as customer_name, c.email as customer_email, u.name as seller_name
       FROM sales_orders so
       LEFT JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON so.user_id = u.id
       WHERE so.id = $1`,
      [req.params.id]
    );
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Order not found' });

    const itemsResult = await query(
      `SELECT soi.*, p.name as product_name, p.sku
       FROM sales_order_items soi
       LEFT JOIN products p ON soi.product_id = p.id
       WHERE soi.order_id = $1`,
      [req.params.id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    logger.error('Get order error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { customer_id, items, discount = 0, tax = 0, notes } = req.body;

    if (!items || !items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    let subtotal = 0;
    const enrichedItems = [];

    for (const item of items) {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = true FOR UPDATE',
        [item.product_id]
      );
      if (!productResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
      const product = productResult.rows[0];
      if (product.stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      const itemTotal = (product.unit_price * item.quantity) - (item.discount || 0);
      subtotal += itemTotal;
      enrichedItems.push({ ...item, unit_price: product.unit_price, total: itemTotal, product });
    }

    const total = subtotal - discount + tax;
    const orderNumber = generateOrderNumber();

    const orderResult = await client.query(
      `INSERT INTO sales_orders (order_number, customer_id, user_id, status, subtotal, discount, tax, total, notes)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8) RETURNING *`,
      [orderNumber, customer_id, req.user.id, subtotal, discount, tax, total, notes]
    );
    const order = orderResult.rows[0];

    for (const item of enrichedItems) {
      await client.query(
        `INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, discount, total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total]
      );
      const prevQty = item.product.stock_quantity;
      const newQty = prevQty - item.quantity;
      await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [newQty, item.product_id]);
      await client.query(
        `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes)
         VALUES ($1,$2,'out',$3,$4,$5,'sale',$6,$7)`,
        [item.product_id, req.user.id, item.quantity, prevQty, newQty, order.id, `Sale order ${orderNumber}`]
      );
    }

    await client.query('COMMIT');
    logger.info('Order created', { orderId: order.id, orderNumber, userId: req.user.id });
    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create order error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await query(
      'UPDATE sales_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update order status error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAll, getOne, create, updateStatus };
