const BASE = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token: string; company: any; branch: any }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: any; company: any; branch: any }>('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Setup
  checkSetup: () => request<{ needsSetup: boolean }>('/api/auth/setup'),
  setup: (data: {
    companyName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    branchName?: string;
    branchPhone?: string;
    branchAddress?: string;
  }) => request<{ user: any; token: string; company: any; branch: any }>('/api/auth/setup', {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Products
  getProducts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/api/products${qs}`);
  },
  createProduct: (data: any) => request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<any[]>('/api/categories'),
  createCategory: (data: any) => request('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => request(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/invoices${qs}`);
  },
  getInvoice: (id: string) => request<any>(`/api/invoices/${id}`),
  createInvoice: (data: any) => request('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: any) => request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  payInvoice: (id: string, data: any) => request(`/api/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  closeInvoice: (id: string) => request(`/api/invoices/${id}/close`, { method: 'POST' }),

  // Branches
  getBranches: () => request<any[]>('/api/branches'),
  createBranch: (data: any) => request('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: any) => request(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getBranchProducts: (id: string) => request<any[]>(`/api/branches/${id}/products`),

  // Users
  getUsers: () => request<any[]>('/api/users'),
  createUser: (data: any) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserStatus: (id: string) => request(`/api/users/${id}/status`, { method: 'PUT' }),

  // Reports
  getSummary: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/reports/summary${qs}`);
  },
  getSales: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/reports/sales${qs}`);
  },
  getProductReport: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/reports/products${qs}`);
  },
  getCashierReport: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/reports/cashiers${qs}`);
  },

  // Audit Logs
  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/audit-logs${qs}`);
  },

  // Settings
  getSettings: () => request<any>('/api/settings'),
  updateSettings: (data: any) => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
    return fetch('/api/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
};
