# 📦 StockFlow ERP

[![CI/CD Pipeline](https://github.com/jaysonstn/stockflow-v1/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/SEU_USUARIO/stockflow-erp/actions/workflows/ci-cd.yml)
![Node](https://img.shields.io/badge/Node.js-20-green)
![React](https://img.shields.io/badge/React-18+Vite-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

Sistema de gestão de estoque e vendas full-stack, containerizado com Docker e com pipeline CI/CD completo via GitHub Actions.

---

## 🏗️ Arquitetura

```
                    ┌──────────────────────────────────────┐
                    │          Docker Network               │
                    │                                      │
Browser ── :3000 ─► │  frontend (Vite/React)               │
                    │          │                           │
                    │          ▼ :3001                     │
                    │  backend (Node.js/Express)           │
                    │          │                           │
                    │     ┌────┴────┐                      │
                    │     ▼         ▼                      │
                    │  postgres   redis                    │
                    │  :5432      :6379                    │
                    └──────────────────────────────────────┘
```

| Serviço  | Imagem             | Porta | Descrição                      |
|----------|--------------------|-------|--------------------------------|
| frontend | node:20-alpine     | 3000  | Vite dev / Nginx prod          |
| backend  | node:20-alpine     | 3001  | API REST Express + JWT         |
| postgres | postgres:16-alpine | 5432  | Banco de dados principal       |
| redis    | redis:7-alpine     | 6379  | Cache                          |

---

## 🛠️ Tech Stack

| Camada          | Tecnologia                                 |
|-----------------|--------------------------------------------|
| Frontend        | React 18, Vite 5, React Router 6, Recharts |
| Backend         | Node.js 20, Express 4, JWT, bcrypt         |
| Banco de dados  | PostgreSQL 16                              |
| Cache           | Redis 7                                    |
| Testes          | Vitest (frontend), Jest (backend)          |
| Containerização | Docker, Docker Compose                     |
| CI/CD           | GitHub Actions                             |
| Proxy reverso   | Nginx                                      |

---

## 🚀 Quick Start

### Pré-requisitos

| Ferramenta     | Versão mínima |
|----------------|---------------|
| Docker         | 24+           |
| Docker Compose | 2.20+         |
| Git            | qualquer      |

### 1. Clonar o repositório

```bash
git clone https://github.com/jaysonstn/Stockflow-v1.git
cd stockflow-erp
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Para desenvolvimento local os valores padrão já funcionam
```

### 3. Subir os containers

```bash
docker compose up -d
```

O backend aguarda o PostgreSQL estar saudável antes de iniciar (healthcheck configurado).
O seed do banco roda automaticamente na primeira inicialização — nenhum passo manual necessário.

| Serviço      | URL                              |
|--------------|----------------------------------|
| Frontend     | http://localhost:3000            |
| API          | http://localhost:3001/api        |
| Health check | http://localhost:3001/api/health |

### 4. Credenciais de acesso

| Email                   | Senha     | Perfil   |
|-------------------------|-----------|----------|
| admin@stockflow.com     | Admin@123 | Admin    |
| maria@stockflow.com     | Admin@123 | Manager  |
| joao@stockflow.com      | Admin@123 | Employee |

> As senhas são geradas via bcrypt em runtime pelo `seed.js` — nenhum hash hardcoded no repositório.

---

## 🗂️ Estrutura do Projeto

```
stockflow-v1/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml           # Pipeline principal
│       └── pr-checks.yml       # Validações em PRs
│
├── backend/
│   ├── src/
│   │   ├── controllers/        # Handlers das rotas
│   │   ├── database/
│   │   │   ├── init.sql        # Schema do banco
│   │   │   ├── seed.js         # Seed executado no startup
│   │   │   └── db.js           # Pool de conexões
│   │   ├── middleware/         # Auth JWT
│   │   ├── routes/             # Definição das rotas
│   │   ├── utils/              # Logger (Winston)
│   │   ├── app.js              # Express + middlewares
│   │   └── server.js           # Startup + wait-for-db loop
│   ├── __tests__/              # Testes Jest
│   ├── Dockerfile              # Multi-stage build
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout e componentes reutilizáveis
│   │   ├── contexts/           # AuthContext.jsx
│   │   ├── pages/              # LoginPage, Dashboard, Products...
│   │   ├── services/           # Cliente Axios (api.js)
│   │   ├── App.jsx             # Rotas e ProtectedRoute
│   │   └── main.jsx            # Entry point
│   ├── __tests__/              # Testes Vitest
│   ├── index.html              # Entry HTML (padrão Vite)
│   ├── vite.config.js          # Config Vite + Vitest
│   ├── Dockerfile              # Multi-stage build
│   └── package.json
│
├── nginx/
│   └── nginx.conf              # Proxy /api → backend
├── docker-compose.yml          # Stack de desenvolvimento
├── docker-compose.prod.yml     # Overrides de produção
└── .env.example                # Template de variáveis
```

---

## 🔧 Desenvolvimento

### Rodar sem Docker (apenas banco via Docker)

```bash
# Sobe só o banco e o redis
docker compose up postgres redis -d

# Backend (outro terminal)
cd backend
npm install
npm run dev       # http://localhost:3001

# Frontend (outro terminal)
cd frontend
npm install
npm run dev       # http://localhost:3000
```

### Rodar os testes

```bash
# Backend (Jest)
cd backend && npm test

# Frontend (Vitest)
cd frontend && npm run test:ci
```

### Logs dos containers

```bash
# Todos os serviços
docker compose logs -f

# Serviço específico
docker logs stockflow_api -f
docker logs stockflow_db -f
docker logs stockflow_web -f
```

### Acessar o banco diretamente

```bash
docker exec -it stockflow_db psql -U stockflow -d stockflow
```

### Rebuild após mudanças de dependência

```bash
docker compose down -v
docker compose up -d --build
```

---

## 🚢 CI/CD Pipeline

Pipeline completo via GitHub Actions disparado a cada push e PR:

```
Push / PR
    │
    ├─► 🧪 Backend Tests
    │       └── Jest + cobertura + PostgreSQL service container
    │
    ├─► 🎨 Frontend Tests + Build
    │       └── Vitest + cobertura + vite build
    │
    └─► (apenas main/develop)
            │
            ▼
        🐳 Build & Push Docker Images → GHCR
            │
            └─► (apenas main)
                    │
                    ▼
                🚀 Deploy via SSH
                    └── docker compose pull + up --no-deps
                    └── health check automático
                    └── rollback em caso de falha
```

### Secrets necessários para deploy

| Secret              | Descrição                         |
|---------------------|-----------------------------------|
| `DEPLOY_HOST`       | IP ou hostname do servidor        |
| `DEPLOY_USER`       | Usuário SSH                       |
| `DEPLOY_SSH_KEY`    | Chave SSH privada                 |
| `POSTGRES_DB`       | Nome do banco em produção         |
| `POSTGRES_USER`     | Usuário do banco em produção      |
| `POSTGRES_PASSWORD` | Senha do banco em produção        |
| `JWT_SECRET`        | Secret JWT (mínimo 32 caracteres) |

### Variables necessárias

| Variable          | Exemplo                                  |
|-------------------|------------------------------------------|
| `PRODUCTION_URL`  | https://stockflow.suaempresa.com         |
| `VITE_API_URL`    | https://api.stockflow.suaempresa.com/api |
| `DEPLOY_PATH`     | /opt/stockflow                           |

---

## 🐳 Deploy em Produção

```bash
# No servidor de produção
mkdir -p /opt/stockflow && cd /opt/stockflow

# Baixar os arquivos necessários
curl -O https://raw.githubusercontent.com/jaysonstn/stockflow-v1/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/jaysonstn/stockflow-v1/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/jaysonstn/stockflow-v1/main/nginx/nginx.conf

# Configurar variáveis de produção
cp .env.example .env
nano .env

# Subir
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📄 API Reference

| Método | Endpoint                      | Descrição             | Auth     |
|--------|-------------------------------|-----------------------|----------|
| POST   | `/api/auth/login`             | Login                 | Público  |
| GET    | `/api/auth/profile`           | Perfil do usuário     | ✓        |
| GET    | `/api/health`                 | Health check          | Público  |
| GET    | `/api/dashboard`              | Estatísticas          | ✓        |
| GET    | `/api/products`               | Listar produtos       | ✓        |
| POST   | `/api/products`               | Criar produto         | Manager+ |
| PUT    | `/api/products/:id`           | Atualizar produto     | Manager+ |
| POST   | `/api/products/:id/stock`     | Ajustar estoque       | ✓        |
| GET    | `/api/products/:id/movements` | Histórico de estoque  | ✓        |
| GET    | `/api/orders`                 | Listar pedidos        | ✓        |
| POST   | `/api/orders`                 | Criar pedido          | ✓        |
| PATCH  | `/api/orders/:id/status`      | Atualizar status      | ✓        |
| GET    | `/api/customers`              | Listar clientes       | ✓        |
| POST   | `/api/customers`              | Criar cliente         | ✓        |
| PUT    | `/api/customers/:id`          | Atualizar cliente     | ✓        |
| GET    | `/api/users`                  | Listar usuários       | Admin    |
| POST   | `/api/users`                  | Criar usuário         | Admin    |
| PATCH  | `/api/users/:id/toggle`       | Ativar/desativar      | Admin    |

---

## 🔒 Segurança

- Helmet.js para headers HTTP de segurança
- Rate limiting (200 req/15min em produção)
- Autenticação JWT com expiração configurável
- Hash de senhas com bcrypt gerado em runtime (custo 10)
- Validação de entrada com express-validator
- Container de produção roda como usuário não-root
- CORS restrito por ambiente (wildcard apenas em dev)

---

## 📝 Licença

MIT