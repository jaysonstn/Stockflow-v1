-- StockFlow ERP - Database Schema
-- Version: 1.0.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 5,
  max_stock_level INTEGER NOT NULL DEFAULT 1000,
  unit VARCHAR(50) DEFAULT 'un',
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales order items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'return')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Users are seeded by seed.js at startup (bcrypt hash generated at runtime)

-- Seed categories
INSERT INTO categories (name, description, color) VALUES
  ('Electronics', 'Electronic devices and components', '#3b82f6'),
  ('Office Supplies', 'Stationery and office materials', '#10b981'),
  ('Furniture', 'Office and home furniture', '#f59e0b'),
  ('Clothing', 'Apparel and accessories', '#ec4899'),
  ('Food & Beverage', 'Consumables and perishables', '#ef4444')
ON CONFLICT DO NOTHING;

-- Seed suppliers
INSERT INTO suppliers (name, email, phone, is_active) VALUES
  ('TechCorp Ltda', 'vendas@techcorp.com', '+55 11 99999-0001', true),
  ('OfficeMax Brasil', 'contato@officemax.com.br', '+55 11 99999-0002', true),
  ('FurniturePlus', 'info@furnitureplus.com', '+55 21 99999-0003', true)
ON CONFLICT DO NOTHING;

-- Seed products
INSERT INTO products (sku, name, description, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit)
SELECT
  'ELEC-001', 'Laptop Pro 15"', 'High performance laptop', c.id, 4500.00, 3200.00, 45, 10, 'un'
FROM categories c WHERE c.name = 'Electronics'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, description, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit)
SELECT
  'ELEC-002', 'Wireless Mouse', 'Ergonomic wireless mouse', c.id, 89.90, 45.00, 120, 20, 'un'
FROM categories c WHERE c.name = 'Electronics'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, description, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit)
SELECT
  'OFFC-001', 'A4 Paper Ream', '500 sheets, 75g', c.id, 29.90, 18.00, 8, 10, 'resma'
FROM categories c WHERE c.name = 'Office Supplies'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, description, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit)
SELECT
  'OFFC-002', 'Ballpoint Pen Box', 'Box with 50 blue pens', c.id, 24.90, 12.00, 0, 5, 'cx'
FROM categories c WHERE c.name = 'Office Supplies'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, description, category_id, unit_price, cost_price, stock_quantity, min_stock_level, unit)
SELECT
  'FURN-001', 'Ergonomic Chair', 'Adjustable office chair with lumbar support', c.id, 1299.00, 780.00, 15, 3, 'un'
FROM categories c WHERE c.name = 'Furniture'
ON CONFLICT (sku) DO NOTHING;

-- Seed customers
INSERT INTO customers (name, email, phone) VALUES
  ('João Silva', 'joao.silva@email.com', '+55 11 98765-4321'),
  ('Maria Santos', 'maria.santos@empresa.com.br', '+55 21 98765-4322'),
  ('Empresa ABC Ltda', 'compras@empresa-abc.com.br', '+55 31 98765-4323'),
  ('Tech Solutions', 'procurement@techsolutions.com', '+55 11 98765-4324')
ON CONFLICT DO NOTHING;
