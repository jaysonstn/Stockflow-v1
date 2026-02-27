const { query, getClient } = require('../database/db');
const logger = require('../utils/logger');

const getAll = async (req, res) => {
  try {
    const { search, category_id, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.is_active = true';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (category_id) {
      paramCount++;
      whereClause += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
    }
    if (low_stock === 'true') {
      whereClause += ' AND p.stock_quantity <= p.min_stock_level';
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    );

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT p.*, c.name as category_name, c.color as category_color,
              s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Get products error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get product error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { sku, name, description, category_id, supplier_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, unit } = req.body;
    const result = await query(
      `INSERT INTO products (sku, name, description, category_id, supplier_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [sku, name, description, category_id, supplier_id, unit_price, cost_price, stock_quantity || 0, min_stock_level || 5, max_stock_level || 1000, unit || 'un']
    );
    if (stock_quantity > 0) {
      await query(
        `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_quantity, new_quantity, notes)
         VALUES ($1,$2,'in',$3,0,$4,'Initial stock')`,
        [result.rows[0].id, req.user.id, stock_quantity, stock_quantity]
      );
    }
    logger.info('Product created', { productId: result.rows[0].id, userId: req.user.id });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'SKU already exists' });
    logger.error('Create product error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { name, description, category_id, supplier_id, unit_price, cost_price, min_stock_level, max_stock_level, unit, is_active } = req.body;
    const result = await query(
      `UPDATE products SET name=$1, description=$2, category_id=$3, supplier_id=$4,
       unit_price=$5, cost_price=$6, min_stock_level=$7, max_stock_level=$8, unit=$9, is_active=$10
       WHERE id=$11 RETURNING *`,
      [name, description, category_id, supplier_id, unit_price, cost_price, min_stock_level, max_stock_level, unit, is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update product error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const adjustStock = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { type, quantity, notes } = req.body;

    const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!productResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    const prevQty = product.stock_quantity;
    let newQty;

    if (type === 'in') newQty = prevQty + quantity;
    else if (type === 'out') {
      if (prevQty < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      newQty = prevQty - quantity;
    } else if (type === 'adjustment') {
      newQty = quantity;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [newQty, req.params.id]);
    await client.query(
      `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_quantity, new_quantity, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.params.id, req.user.id, type, quantity, prevQty, newQty, notes]
    );

    await client.query('COMMIT');
    logger.info('Stock adjusted', { productId: req.params.id, type, quantity, userId: req.user.id });
    res.json({ message: 'Stock updated', previous: prevQty, current: newQty });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Stock adjustment error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

const getMovements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Get movements error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAll, getOne, create, update, adjustStock, getMovements };
