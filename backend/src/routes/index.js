const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');

// Controllers
const authCtrl = require('../controllers/authController');
const productsCtrl = require('../controllers/productsController');
const ordersCtrl = require('../controllers/ordersController');
const customersCtrl = require('../controllers/customersController');
const dashboardCtrl = require('../controllers/dashboardController');
const { query } = require('../database/db');

// ─── Auth Routes ───────────────────────────────────────────────
router.post('/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  authCtrl.login
);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/password', authenticate, authCtrl.changePassword);

// ─── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboardCtrl.getStats);

// ─── Products ──────────────────────────────────────────────────
router.get('/products', authenticate, productsCtrl.getAll);
router.get('/products/:id', authenticate, productsCtrl.getOne);
router.post('/products', authenticate, authorize('admin', 'manager'), productsCtrl.create);
router.put('/products/:id', authenticate, authorize('admin', 'manager'), productsCtrl.update);
router.post('/products/:id/stock', authenticate, productsCtrl.adjustStock);
router.get('/products/:id/movements', authenticate, productsCtrl.getMovements);

// ─── Sales Orders ──────────────────────────────────────────────
router.get('/orders', authenticate, ordersCtrl.getAll);
router.get('/orders/:id', authenticate, ordersCtrl.getOne);
router.post('/orders', authenticate, ordersCtrl.create);
router.patch('/orders/:id/status', authenticate, ordersCtrl.updateStatus);

// ─── Customers ─────────────────────────────────────────────────
router.get('/customers', authenticate, customersCtrl.getAll);
router.get('/customers/:id', authenticate, customersCtrl.getOne);
router.post('/customers', authenticate, customersCtrl.create);
router.put('/customers/:id', authenticate, customersCtrl.update);

// ─── Categories ────────────────────────────────────────────────
router.get('/categories', authenticate, async (req, res) => {
  const result = await query('SELECT * FROM categories ORDER BY name ASC');
  res.json(result.rows);
});
router.post('/categories', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, description, color } = req.body;
  const result = await query(
    'INSERT INTO categories (name, description, color) VALUES ($1,$2,$3) RETURNING *',
    [name, description, color || '#6366f1']
  );
  res.status(201).json(result.rows[0]);
});

// ─── Suppliers ─────────────────────────────────────────────────
router.get('/suppliers', authenticate, async (req, res) => {
  const result = await query('SELECT * FROM suppliers WHERE is_active = true ORDER BY name ASC');
  res.json(result.rows);
});
router.post('/suppliers', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, email, phone, address, tax_id } = req.body;
  const result = await query(
    'INSERT INTO suppliers (name, email, phone, address, tax_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, email, phone, address, tax_id]
  );
  res.status(201).json(result.rows[0]);
});

// ─── Users (admin only) ────────────────────────────────────────
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  const result = await query('SELECT id, name, email, role, is_active, last_login_at, created_at FROM users ORDER BY name ASC');
  res.json(result.rows);
});

router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role',
      [name, email.toLowerCase(), hash, role || 'employee']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/toggle', authenticate, authorize('admin'), async (req, res) => {
  const result = await query(
    'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, email, role, is_active',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

// ─── Health check ──────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
