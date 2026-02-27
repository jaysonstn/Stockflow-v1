const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const logger = require('../utils/logger');

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Admin@123';

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT email FROM users');
    const existingEmails = existing.rows.map(r => r.email);

    const users = [
      { name: 'Admin User',    email: 'admin@stockflow.com', role: 'admin' },
      { name: 'Maria Gerente', email: 'maria@stockflow.com', role: 'manager' },
      { name: 'Joao Vendedor', email: 'joao@stockflow.com',  role: 'employee' },
    ];

    for (const u of users) {
      if (!existingEmails.includes(u.email)) {
        const hash = await bcrypt.hash(SEED_PASSWORD, 10);
        await client.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
          [u.name, u.email, hash, u.role]
        );
        logger.info('Seeded user: ' + u.email);
      }
    }

    const prodCount = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCount.rows[0].count) === 0) {
      const cats = await client.query('SELECT id, name FROM categories');
      const catMap = {};
      cats.rows.forEach(c => { catMap[c.name] = c.id; });

      const products = [
        ['ELEC-001', 'Laptop Pro 15"',    'Eletronicos',  4500,   3200, 45,  10],
        ['ELEC-002', 'Mouse Wireless',    'Eletronicos',  89.90,  45,   120, 20],
        ['ELEC-003', 'Teclado Mecanico',  'Eletronicos',  349,    180,  3,   10],
        ['OFFC-001', 'Resma Papel A4',    'Escritorio',   29.90,  18,   8,   10],
        ['OFFC-002', 'Canetas CX 50',     'Escritorio',   24.90,  12,   0,   5 ],
        ['FURN-001', 'Cadeira Ergonomica','Moveis',       1299,   780,  15,  3 ],
        ['FURN-002', 'Mesa Standing Desk','Moveis',       2199,   1300, 7,   2 ],
      ];
      for (const [sku, name, cat, price, cost, stock, min] of products) {
        const catId = Object.values(catMap)[0] || null;
        await client.query(
          "INSERT INTO products (sku, name, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit) VALUES ($1,$2,$3,$4,$5,$6,$7,'un') ON CONFLICT (sku) DO NOTHING",
          [sku, name, catId, price, cost, stock, min]
        );
      }
      logger.info('Products seeded');
    }

    const custCount = await client.query('SELECT COUNT(*) FROM customers');
    if (parseInt(custCount.rows[0].count) === 0) {
      const custs = [
        ['Joao Silva',       'joao.silva@email.com',        '(11) 98765-4321'],
        ['Maria Santos',     'maria.santos@empresa.com.br', '(21) 98765-4322'],
        ['Empresa ABC Ltda', 'compras@abc.com.br',          '(31) 98765-4323'],
        ['Tech Solutions',   'compras@techsolutions.com',   '(11) 98765-4324'],
      ];
      for (const [name, email, phone] of custs) {
        await client.query('INSERT INTO customers (name, email, phone) VALUES ($1,$2,$3)', [name, email, phone]);
      }
      logger.info('Customers seeded');
    }

    logger.info('Seed complete. Login: admin@stockflow.com / Admin@123');
  } catch (err) {
    logger.error('Seed error: ' + err.message);
  } finally {
    client.release();
  }
}

module.exports = seed;
