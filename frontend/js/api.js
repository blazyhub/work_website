// ─── API Client ───────────────────────────────────────────────────────────────
const API_BASE = '/api';

const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return res.json();
  },

  async changePassword(newPassword, token) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ newPassword })
    });
    return res.json();
  },

  // ── Config ────────────────────────────────────────────────────────────────
  async getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
  },

  async updateConfig(data, token) {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updatePlatform(id, data, token) {
    const res = await fetch(`${API_BASE}/config/platforms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async addPlatform(data, token) {
    const res = await fetch(`${API_BASE}/config/platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── Products ──────────────────────────────────────────────────────────────
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/products${query ? '?' + query : ''}`);
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    return res.json();
  },

  async createProduct(data, token) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateProduct(id, data, token) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteProduct(id, token) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  // ── Categories ────────────────────────────────────────────────────────────
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return res.json();
  },

  async createCategory(data, token) {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCategory(id, token) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};

window.api = api;
