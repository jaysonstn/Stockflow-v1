import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Mock api ──────────────────────────────────────────────────────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../services/api.js', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  },
}))

// ── Mock recharts ─────────────────────────────────────────────────────────────
vi.mock('recharts', () => {
  const Mock = ({ children }) => React.createElement('div', null, children)
  return {
    BarChart: Mock, LineChart: Mock, PieChart: Mock, AreaChart: Mock,
    Bar: () => null, Line: () => null, Pie: () => null,
    Area: () => null, Cell: () => null,
    XAxis: () => null, YAxis: () => null, Tooltip: () => null,
    Legend: () => null, CartesianGrid: () => null,
    ResponsiveContainer: ({ children }) => React.createElement('div', null, children),
  }
})

// ── Mock react-router-dom ─────────────────────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import { AuthProvider } from '../contexts/AuthContext.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import ProductsPage from '../pages/ProductsPage.jsx'
import CustomersPage from '../pages/CustomersPage.jsx'
import StockPage from '../pages/StockPage.jsx'

const withAuth = (ui) => React.createElement(AuthProvider, null, ui)
const emptyList = { data: { data: [], total: 0 } }
const emptyArr  = { data: [] }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockGet.mockResolvedValue(emptyList)
  mockPost.mockResolvedValue({
    data: { token: 'tok', user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' } },
  })
})

// ── AuthContext ───────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  it('renders children without crashing (no token)', async () => {
    await act(async () => {
      render(React.createElement(AuthProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'ok')))
    })
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('fetches profile when token exists', async () => {
    localStorage.setItem('token', 'existing-token')
    mockGet.mockResolvedValueOnce({ data: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' } })
    await act(async () => {
      render(React.createElement(AuthProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'ok')))
    })
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('clears token when profile fetch fails', async () => {
    localStorage.setItem('token', 'bad-token')
    mockGet.mockRejectedValueOnce(new Error('Unauthorized'))
    await act(async () => {
      render(React.createElement(AuthProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'ok')))
    })
    expect(localStorage.getItem('token')).toBeNull()
  })
})

// ── LoginPage ─────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  it('renders login form', async () => {
    await act(async () => { render(withAuth(React.createElement(LoginPage))) })
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows email and password inputs', async () => {
    await act(async () => { render(withAuth(React.createElement(LoginPage))) })
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { error: 'Invalid credentials' } } })
    await act(async () => { render(withAuth(React.createElement(LoginPage))) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    })
    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument())
  })

  it('calls api.post on submit', async () => {
    await act(async () => { render(withAuth(React.createElement(LoginPage))) })
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'admin@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Admin@123' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    })
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'admin@test.com', password: 'Admin@123' })
    )
  })
})

// ── DashboardPage ─────────────────────────────────────────────────────────────
describe('DashboardPage', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({
      data: {
        totals: { products: 10, lowStockProducts: 2, orders: 5, pendingOrders: 1, revenueToday: 1000, revenueMonth: 15000 },
        topProducts: [], recentOrders: [], salesByStatus: [], stockAlerts: [], salesLast7Days: [],
      },
    })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(withAuth(React.createElement(DashboardPage))) })
    await waitFor(() => expect(screen.getByText(/monthly revenue/i)).toBeInTheDocument())
  })

  it('displays stat cards', async () => {
    await act(async () => { render(withAuth(React.createElement(DashboardPage))) })
    await waitFor(() => expect(screen.getByText(/total orders/i)).toBeInTheDocument())
  })
})

// ── ProductsPage ──────────────────────────────────────────────────────────────
describe('ProductsPage', () => {
  beforeEach(() => {
    mockGet.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(emptyArr)
      if (url === '/suppliers')  return Promise.resolve(emptyArr)
      return Promise.resolve(emptyList)
    })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(withAuth(React.createElement(ProductsPage))) })
    await waitFor(() => expect(screen.getByText(/new product/i)).toBeInTheDocument())
  })

  it('shows search input', async () => {
    await act(async () => { render(withAuth(React.createElement(ProductsPage))) })
    await waitFor(() => expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument())
  })

  it('opens modal on New Product click', async () => {
    await act(async () => { render(withAuth(React.createElement(ProductsPage))) })
    await waitFor(() => screen.getByText(/new product/i))
    await act(async () => { fireEvent.click(screen.getByText(/new product/i)) })
    await waitFor(() => expect(screen.getByText(/product name/i)).toBeInTheDocument())
  })
})

// ── CustomersPage ─────────────────────────────────────────────────────────────
describe('CustomersPage', () => {
  it('renders without crashing', async () => {
    await act(async () => { render(withAuth(React.createElement(CustomersPage))) })
    await waitFor(() => expect(screen.getByText(/new customer/i)).toBeInTheDocument())
  })

  it('shows search input', async () => {
    await act(async () => { render(withAuth(React.createElement(CustomersPage))) })
    await waitFor(() => expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument())
  })
})

// ── StockPage ─────────────────────────────────────────────────────────────────
describe('StockPage', () => {
  it('renders without crashing', async () => {
    await act(async () => { render(withAuth(React.createElement(StockPage))) })
    await waitFor(() => expect(screen.getByText('Inventory')).toBeInTheDocument())
  })

  it('shows Stock Levels card', async () => {
    await act(async () => { render(withAuth(React.createElement(StockPage))) })
    await waitFor(() => expect(screen.getByText('Stock Levels')).toBeInTheDocument())
  })
})
