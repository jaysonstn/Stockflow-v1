const { query } = require('../database/db');
const logger = require('../utils/logger');

const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE is_active = true';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM customers ${where}`, params);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(
      `SELECT c.*, COUNT(so.id) as total_orders, COALESCE(SUM(so.total),0) as total_spent
       FROM customers c
       LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.status != 'cancelled'
       ${where}
       GROUP BY c.id
       ORDER BY c.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Get customers error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, email, phone, address, tax_id, notes } = req.body;
    const result = await query(
      'INSERT INTO customers (name, email, phone, address, tax_id, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email, phone, address, tax_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create customer error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { name, email, phone, address, tax_id, notes, is_active } = req.body;
    const result = await query(
      'UPDATE customers SET name=$1, email=$2, phone=$3, address=$4, tax_id=$5, notes=$6, is_active=$7 WHERE id=$8 RETURNING *',
      [name, email, phone, address, tax_id, notes, is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAll, getOne, create, update };
