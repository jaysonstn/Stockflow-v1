# 📦 StockFlow ERP

> A professional, full-stack Inventory and Sales Management System built with React, Node.js, and PostgreSQL — ready for production with Docker and GitHub Actions CI/CD.

![CI/CD](https://github.com/YOUR_USERNAME/stockflow/actions/workflows/ci-cd.yml/badge.svg)

## ✨ Features

- **🔐 Authentication** — JWT-based auth with role-based access control (Admin, Manager, Employee)
- **📊 Dashboard** — Real-time KPIs, revenue charts, stock alerts, and recent orders
- **📦 Products** — Full CRUD with categories, suppliers, pricing, and stock levels
- **🏪 Inventory** — Stock movements (in/out/adjustments), full audit trail
- **🛒 Sales Orders** — Create orders with auto stock deduction, status tracking
- **👥 Customers** — CRM with order history and revenue tracking
- **👤 Users** — Admin panel to manage system users and roles
- **📈 Reports** — Revenue analytics and top-selling products

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Recharts |
| Backend | Node.js, Express 4, JWT |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/stockflow.git
cd stockflow
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your settings (optional for local dev)
```

### 3. Start the application
```bash
docker compose up -d
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api
- **Health check**: http://localhost:3001/api/health

### 4. Login
| Email | Password | Role |
|-------|----------|------|
| admin@stockflow.com | Admin@123 | Admin |

## 🏗️ Project Structure

```
stockflow/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml          # Main CI/CD pipeline
│       └── pr-checks.yml      # PR validation checks
├── backend/
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── database/          # DB connection & migrations
│   │   ├── middleware/        # Auth middleware
│   │   ├── routes/            # API routes
│   │   ├── utils/             # Logger, helpers
│   │   ├── app.js             # Express app
│   │   └── server.js          # Entry point
│   ├── __tests__/             # Jest tests
│   ├── Dockerfile             # Multi-stage Docker build
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── contexts/          # Auth context
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   └── App.js             # Router setup
│   ├── public/
│   ├── Dockerfile             # Multi-stage Docker build
│   └── package.json
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker-compose.yml         # Development compose
├── docker-compose.prod.yml    # Production overrides
└── .env.example               # Environment template
```

## 🔧 Development

### Run without Docker
```bash
# Start database
docker compose up postgres redis -d

# Backend
cd backend
npm install
npm run dev   # http://localhost:3001

# Frontend
cd frontend
npm install
npm start     # http://localhost:3000
```

### Run tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test
```

## 🚢 CI/CD Pipeline

The GitHub Actions pipeline runs on every push and PR:

```
Push to main/develop
        ↓
┌───────────────────────────────────────┐
│  1. Backend Tests (with PostgreSQL)   │
│  2. Frontend Tests + Build            │
└───────────────────────────────────────┘
        ↓ (on main/develop only)
┌───────────────────────────────────────┐
│  3. Build & Push Docker images to     │
│     GitHub Container Registry (GHCR) │
└───────────────────────────────────────┘
        ↓ (on main only)
┌───────────────────────────────────────┐
│  4. Deploy to Production via SSH      │
│  5. Health check + rollback on fail   │
└───────────────────────────────────────┘
```

### Required GitHub Secrets for Deploy

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP/hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | Private SSH key |
| `POSTGRES_DB` | Production DB name |
| `POSTGRES_USER` | Production DB user |
| `POSTGRES_PASSWORD` | Production DB password |
| `JWT_SECRET` | Production JWT secret (min 32 chars) |

### Required GitHub Variables

| Variable | Description |
|----------|-------------|
| `PRODUCTION_URL` | e.g., https://stockflow.mycompany.com |
| `REACT_APP_API_URL` | e.g., https://api.stockflow.mycompany.com/api |
| `DEPLOY_PATH` | Server path, e.g., /opt/stockflow |

## 🐳 Production Deployment

```bash
# On your production server:
mkdir -p /opt/stockflow
cd /opt/stockflow
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/stockflow/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/stockflow/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/stockflow/main/nginx/nginx.conf

# Create production .env
cp .env.example .env
# Edit .env with production values

# Start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📄 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/profile` | Get current user | ✓ |
| GET | `/api/dashboard` | Dashboard stats | ✓ |
| GET | `/api/products` | List products | ✓ |
| POST | `/api/products` | Create product | Manager+ |
| PUT | `/api/products/:id` | Update product | Manager+ |
| POST | `/api/products/:id/stock` | Adjust stock | ✓ |
| GET | `/api/orders` | List orders | ✓ |
| POST | `/api/orders` | Create order | ✓ |
| PATCH | `/api/orders/:id/status` | Update status | ✓ |
| GET | `/api/customers` | List customers | ✓ |
| POST | `/api/customers` | Create customer | ✓ |
| GET | `/api/users` | List users | Admin |
| POST | `/api/users` | Create user | Admin |

## 🔒 Security

- Helmet.js for HTTP security headers
- Rate limiting (100 req/15min in production)
- JWT authentication with expiry
- bcrypt password hashing (cost factor 12)
- Input validation via express-validator
- Non-root Docker user in production
- Environment-based CORS

## 📝 License

MIT
