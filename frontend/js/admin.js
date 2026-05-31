/* ═══════════════════════════════════════════════════════════════════
   DealHunt — Admin Panel Controller
═══════════════════════════════════════════════════════════════════ */

let TOKEN = localStorage.getItem('dh_admin_token') || null;
let ALL_PRODUCTS = [];
let ALL_CATEGORIES = [];
let SITE_CONFIG = {};
let editingProductId = null;

// ─── Boot ──────────────────────────────────────────────────────────
(async function boot() {
  if (TOKEN) {
    await showAdminApp();
  } else {
    window.location.href = '/admin/login';
  }
  const pwEl = document.getElementById('login-password');
  if (pwEl) {
    pwEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }
})();

// ─── Login / Logout ────────────────────────────────────────────────
async function doLogin() {
  const pw = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const data = await api.login(pw);
    if (data.success) {
      TOKEN = data.token;
      localStorage.setItem('dh_admin_token', TOKEN);
      await showAdminApp();
    } else {
      err.textContent = data.error || 'Invalid password.';
      err.style.display = 'block';
    }
  } catch (e) {
    err.textContent = 'Cannot connect to server. Is the backend running?';
    err.style.display = 'block';
  } finally {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
  }
}

function doLogout() {
  TOKEN = null;
  localStorage.removeItem('dh_admin_token');
  
  // Call server logout to clear secure cookie
  fetch('/api/auth/logout', { method: 'POST' })
    .catch(err => console.error('Logout error:', err))
    .finally(() => {
      window.location.href = '/admin/login';
    });
}

async function showAdminApp() {
  const loginEl = document.getElementById('login-screen');
  if (loginEl) loginEl.style.display = 'none';
  
  const appEl = document.getElementById('admin-app');
  if (appEl) appEl.classList.add('visible');
  
  await loadAllData();
}

// ─── Load All Data ─────────────────────────────────────────────────
async function loadAllData() {
  await Promise.all([loadProducts(), loadCategories(), loadConfig()]);
  renderDashboard();
  renderProductsTable();
  renderPricingTable();
  renderCategoriesTable();
  renderPlatformsList();
  loadSettings();
  populateModalDropdowns();
}

async function loadProducts() {
  const data = await api.getProducts({ active: 'all' });
  ALL_PRODUCTS = data.products || [];
}

async function loadCategories() {
  const data = await api.getCategories();
  ALL_CATEGORIES = data.categories || [];
}

async function loadConfig() {
  const data = await api.getConfig();
  SITE_CONFIG = data.config || {};
}

// ─── Page Switching ────────────────────────────────────────────────
function showPage(page, el) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', products: 'Products', pricing: 'Price & Discount Editor',
    categories: 'Categories', platforms: 'Platforms', settings: 'Site Settings'
  };
  document.getElementById('top-bar-title').textContent = titles[page] || page;
}

// ─── Dashboard ─────────────────────────────────────────────────────
function renderDashboard() {
  const active = ALL_PRODUCTS.filter(p => p.active).length;
  const featured = ALL_PRODUCTS.filter(p => p.featured).length;
  document.getElementById('ds-products').textContent = active;
  document.getElementById('ds-categories').textContent = ALL_CATEGORIES.length;
  document.getElementById('ds-platforms').textContent = (SITE_CONFIG.platforms || []).filter(p => p.active).length;
  document.getElementById('ds-featured').textContent = featured;

  const tbody = document.getElementById('dash-recent-body');
  tbody.innerHTML = ALL_PRODUCTS.slice(0, 10).map(p => {
    const pi = getPlatformInfo(p.platform);
    return `<tr>
      <td><img class="table-img" src="${p.image || ''}" onerror="this.src='https://placehold.co/44/161a27/ff9900?text=?'" alt="" /></td>
      <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.title)}</td>
      <td><span class="platform-pill" style="background:${pi.color}22;color:${pi.color}">${pi.icon} ${pi.name}</span></td>
      <td class="price-badge">₹${fmt(p.salePrice)}</td>
      <td><span class="discount-pct">${p.discount}%</span></td>
      <td><span class="active-dot ${p.active ? 'on' : 'off'}"></span></td>
    </tr>`;
  }).join('');
}

// ─── Products Table ────────────────────────────────────────────────
function renderProductsTable(filter = '') {
  const tbody = document.getElementById('products-table-body');
  const list = filter
    ? ALL_PRODUCTS.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()))
    : ALL_PRODUCTS;

  tbody.innerHTML = list.map(p => {
    const pi = getPlatformInfo(p.platform);
    return `<tr id="prod-row-${p.id}">
      <td><img class="table-img" src="${p.image || ''}" onerror="this.src='https://placehold.co/44/161a27/ff9900?text=?'" alt="" /></td>
      <td style="max-width:200px">
        <div style="font-weight:600;font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.title)}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${p.id}</div>
      </td>
      <td><span class="platform-pill" style="background:${pi.color}22;color:${pi.color}">${pi.icon} ${pi.name}</span></td>
      <td>₹${fmt(p.mrp)}</td>
      <td class="price-badge" style="color:var(--accent)">₹${fmt(p.salePrice)}</td>
      <td><span class="discount-pct">${p.discount}%</span></td>
      <td style="font-size:0.8rem;color:var(--text-secondary)">${p.category}</td>
      <td>${p.featured ? '⭐' : '—'}</td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" ${p.active ? 'checked' : ''} onchange="toggleProductActive('${p.id}', this.checked)" style="accent-color:var(--success)" />
          <span style="font-size:0.78rem;color:var(--text-muted)">${p.active ? 'On' : 'Off'}</span>
        </label>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-info btn-sm" onclick="openEditModal('${p.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}', '${escAttr(p.title)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterProductTable() {
  renderProductsTable(document.getElementById('prod-search').value);
}

// ─── Price & Discount Table ────────────────────────────────────────
function renderPricingTable(filter = '') {
  const tbody = document.getElementById('pricing-table-body');
  const list = filter
    ? ALL_PRODUCTS.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()))
    : ALL_PRODUCTS;

  tbody.innerHTML = list.map(p => {
    const pi = getPlatformInfo(p.platform);
    const savings = p.mrp - p.salePrice;
    return `<tr id="price-row-${p.id}">
      <td style="max-width:220px">
        <div style="font-weight:600;font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escAttr(p.title)}">${escHtml(p.title)}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${p.id}</div>
      </td>
      <td><span class="platform-pill" style="background:${pi.color}22;color:${pi.color}">${pi.icon} ${pi.name}</span></td>
      <td>
        <input type="number" class="form-control" style="width:110px" id="pr-mrp-${p.id}" value="${p.mrp}" min="0"
          oninput="recalcPriceRow('${p.id}')" />
      </td>
      <td>
        <input type="number" class="form-control" style="width:120px" id="pr-sale-${p.id}" value="${p.salePrice}" min="0"
          oninput="recalcDiscountRow('${p.id}')" />
      </td>
      <td>
        <input type="number" class="form-control" style="width:90px" id="pr-disc-${p.id}" value="${p.discount}" min="0" max="100"
          oninput="recalcSalePriceRow('${p.id}')" />
      </td>
      <td style="color:var(--success);font-weight:600" id="pr-savings-${p.id}">₹${fmt(savings)}</td>
      <td>
        <button class="btn btn-success btn-sm" onclick="savePriceRow('${p.id}')">💾 Save</button>
      </td>
    </tr>`;
  }).join('');
}

function filterPriceTable() {
  renderPricingTable(document.getElementById('price-search').value);
}

// Price row calculations
function recalcPriceRow(id) {
  const mrp = +document.getElementById(`pr-mrp-${id}`).value;
  const sale = +document.getElementById(`pr-sale-${id}`).value;
  if (mrp > 0) {
    document.getElementById(`pr-disc-${id}`).value = Math.round(((mrp - sale) / mrp) * 100);
    document.getElementById(`pr-savings-${id}`).textContent = '₹' + fmt(mrp - sale);
  }
}
function recalcDiscountRow(id) {
  const mrp = +document.getElementById(`pr-mrp-${id}`).value;
  const sale = +document.getElementById(`pr-sale-${id}`).value;
  if (mrp > 0) {
    document.getElementById(`pr-disc-${id}`).value = Math.round(((mrp - sale) / mrp) * 100);
    document.getElementById(`pr-savings-${id}`).textContent = '₹' + fmt(mrp - sale);
  }
}
function recalcSalePriceRow(id) {
  const mrp = +document.getElementById(`pr-mrp-${id}`).value;
  const disc = +document.getElementById(`pr-disc-${id}`).value;
  const sale = Math.round(mrp - (mrp * disc) / 100);
  document.getElementById(`pr-sale-${id}`).value = sale;
  document.getElementById(`pr-savings-${id}`).textContent = '₹' + fmt(mrp - sale);
}

async function savePriceRow(id) {
  const mrp = +document.getElementById(`pr-mrp-${id}`).value;
  const salePrice = +document.getElementById(`pr-sale-${id}`).value;
  const discount = +document.getElementById(`pr-disc-${id}`).value;

  try {
    const data = await api.updateProduct(id, { mrp, salePrice, discount }, TOKEN);
    if (data.success) {
      // Update local cache
      const idx = ALL_PRODUCTS.findIndex(p => p.id === id);
      if (idx !== -1) ALL_PRODUCTS[idx] = data.product;
      showToast('✅ Price updated!', 'success');
    } else {
      showToast(data.error || 'Failed to save.', 'error');
    }
  } catch (e) { showToast('Server error.', 'error'); }
}

// ─── Add/Edit Product Modal ────────────────────────────────────────
function populateModalDropdowns() {
  // Platforms
  const platSel = document.getElementById('pm-platform');
  platSel.innerHTML = (SITE_CONFIG.platforms || []).map(p =>
    `<option value="${p.id}">${p.icon} ${p.name}</option>`
  ).join('');

  // Categories
  const catSel = document.getElementById('pm-category');
  catSel.innerHTML = ALL_CATEGORIES.map(c =>
    `<option value="${c.name}">${c.icon} ${c.name}</option>`
  ).join('');
}

function openAddModal() {
  editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('product-modal-save-btn').textContent = 'Add Product';
  document.getElementById('product-modal-error').style.display = 'none';
  clearProductForm();
  openModal('product-modal');
}

function openEditModal(id) {
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-modal-save-btn').textContent = 'Save Changes';
  document.getElementById('product-modal-error').style.display = 'none';

  document.getElementById('pm-title').value = p.title;
  document.getElementById('pm-description').value = p.description || '';
  document.getElementById('pm-platform').value = p.platform;
  document.getElementById('pm-category').value = p.category;
  document.getElementById('pm-mrp').value = p.mrp;
  document.getElementById('pm-salePrice').value = p.salePrice;
  document.getElementById('pm-discount').value = p.discount;
  document.getElementById('pm-affiliateLink').value = p.affiliateLink;
  document.getElementById('pm-image').value = p.image || '';
  document.getElementById('pm-badge').value = p.badge || '';
  document.getElementById('pm-featured').checked = !!p.featured;
  document.getElementById('pm-active').checked = !!p.active;
  openModal('product-modal');
}

function clearProductForm() {
  ['pm-title','pm-description','pm-affiliateLink','pm-image','pm-badge'].forEach(id => document.getElementById(id).value = '');
  ['pm-mrp','pm-salePrice','pm-discount'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pm-featured').checked = false;
  document.getElementById('pm-active').checked = true;
}

// Auto-calc helpers in modal
function autoCalcDiscount() {
  const mrp = +document.getElementById('pm-mrp').value;
  const sale = +document.getElementById('pm-salePrice').value;
  if (mrp > 0 && sale > 0) document.getElementById('pm-discount').value = Math.round(((mrp - sale) / mrp) * 100);
}
function autoCalcDiscountPct() {
  const mrp = +document.getElementById('pm-mrp').value;
  const sale = +document.getElementById('pm-salePrice').value;
  if (mrp > 0) document.getElementById('pm-discount').value = Math.round(((mrp - sale) / mrp) * 100);
}
function autoCalcSalePrice() {
  const mrp = +document.getElementById('pm-mrp').value;
  const disc = +document.getElementById('pm-discount').value;
  if (mrp > 0) document.getElementById('pm-salePrice').value = Math.round(mrp - (mrp * disc) / 100);
}

async function saveProduct() {
  const errEl = document.getElementById('product-modal-error');
  errEl.style.display = 'none';

  const payload = {
    title:        document.getElementById('pm-title').value.trim(),
    description:  document.getElementById('pm-description').value.trim(),
    platform:     document.getElementById('pm-platform').value,
    category:     document.getElementById('pm-category').value,
    mrp:          +document.getElementById('pm-mrp').value,
    salePrice:    +document.getElementById('pm-salePrice').value,
    discount:     +document.getElementById('pm-discount').value,
    affiliateLink:document.getElementById('pm-affiliateLink').value.trim(),
    image:        document.getElementById('pm-image').value.trim(),
    badge:        document.getElementById('pm-badge').value.trim(),
    featured:     document.getElementById('pm-featured').checked,
    active:       document.getElementById('pm-active').checked,
  };

  if (!payload.title) { errEl.textContent = 'Product title is required.'; errEl.style.display = 'block'; return; }
  if (!payload.affiliateLink) { errEl.textContent = 'Affiliate link is required.'; errEl.style.display = 'block'; return; }
  if (!payload.mrp) { errEl.textContent = 'MRP is required.'; errEl.style.display = 'block'; return; }

  try {
    let data;
    if (editingProductId) {
      data = await api.updateProduct(editingProductId, payload, TOKEN);
    } else {
      data = await api.createProduct(payload, TOKEN);
    }

    if (data.success) {
      closeModal('product-modal');
      await loadProducts();
      renderDashboard();
      renderProductsTable();
      renderPricingTable();
      showToast(editingProductId ? '✅ Product updated!' : '✅ Product added!', 'success');
    } else {
      errEl.textContent = data.error || 'Failed to save product.';
      errEl.style.display = 'block';
    }
  } catch (e) { errEl.textContent = 'Server error. Check backend.'; errEl.style.display = 'block'; }
}

async function toggleProductActive(id, active) {
  try {
    const data = await api.updateProduct(id, { active }, TOKEN);
    if (data.success) {
      const idx = ALL_PRODUCTS.findIndex(p => p.id === id);
      if (idx !== -1) ALL_PRODUCTS[idx].active = active;
      showToast(`Product ${active ? 'activated' : 'deactivated'}`, 'success');
    }
  } catch (e) { showToast('Failed to update.', 'error'); }
}

// ─── Delete ────────────────────────────────────────────────────────
function confirmDelete(id, title) {
  document.getElementById('confirm-msg').textContent = `Delete "${title}"? This cannot be undone.`;
  document.getElementById('confirm-ok-btn').onclick = async () => {
    try {
      const data = await api.deleteProduct(id, TOKEN);
      if (data.success) {
        closeModal('confirm-modal');
        await loadProducts();
        renderDashboard();
        renderProductsTable();
        renderPricingTable();
        showToast('🗑️ Product deleted.', 'success');
      } else { showToast(data.error || 'Delete failed.', 'error'); }
    } catch (e) { showToast('Server error.', 'error'); }
  };
  openModal('confirm-modal');
}

// ─── Categories ────────────────────────────────────────────────────
function renderCategoriesTable() {
  const tbody = document.getElementById('categories-table-body');
  tbody.innerHTML = ALL_CATEGORIES.map(c => `
    <tr>
      <td style="font-size:1.4rem">${c.icon}</td>
      <td style="font-weight:600">${escHtml(c.name)}</td>
      <td style="color:var(--text-muted);font-size:0.78rem">${c.id}</td>
      <td><span class="active-dot ${c.active ? 'on' : 'off'}"></span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}', '${escAttr(c.name)}')">Delete</button>
      </td>
    </tr>`).join('');
}

function openAddCategoryModal() { openModal('category-modal'); }

async function saveCategory() {
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value.trim() || '🏷️';
  if (!name) { showToast('Category name required', 'error'); return; }

  const data = await api.createCategory({ name, icon }, TOKEN);
  if (data.success) {
    closeModal('category-modal');
    await loadCategories();
    renderCategoriesTable();
    populateModalDropdowns();
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = '';
    showToast('✅ Category added!', 'success');
  } else { showToast(data.error || 'Failed', 'error'); }
}

async function deleteCategory(id, name) {
  document.getElementById('confirm-msg').textContent = `Delete category "${name}"?`;
  document.getElementById('confirm-ok-btn').onclick = async () => {
    const data = await api.deleteCategory(id, TOKEN);
    if (data.success) {
      closeModal('confirm-modal');
      await loadCategories();
      renderCategoriesTable();
      showToast('Category deleted.', 'success');
    } else { showToast(data.error, 'error'); }
  };
  openModal('confirm-modal');
}

// ─── Platforms ─────────────────────────────────────────────────────
function renderPlatformsList() {
  const container = document.getElementById('platforms-list');
  const platforms = SITE_CONFIG.platforms || [];
  container.innerHTML = platforms.map(p => `
    <div class="platform-row">
      <div class="platform-color-dot" style="background:${p.color}"></div>
      <div class="platform-name">${p.icon} ${p.name}</div>
      <div class="platform-id-tag">${p.id}</div>
      <label style="display:flex;align-items:center;gap:6px;margin-left:auto;font-size:0.82rem;cursor:pointer">
        <input type="checkbox" ${p.active ? 'checked' : ''} style="accent-color:var(--success)"
          onchange="togglePlatform('${p.id}', this.checked)" />
        ${p.active ? 'Active' : 'Hidden'}
      </label>
    </div>`).join('');
}

async function togglePlatform(id, active) {
  const data = await api.updatePlatform(id, { active }, TOKEN);
  if (data.success) {
    await loadConfig();
    renderPlatformsList();
    showToast(`Platform ${active ? 'enabled' : 'disabled'}.`, 'success');
  }
}

function openAddPlatformModal() { openModal('platform-modal'); }

async function savePlatform() {
  const payload = {
    id:        document.getElementById('plat-id').value.trim().toLowerCase().replace(/\s+/g, '-'),
    name:      document.getElementById('plat-name').value.trim(),
    color:     document.getElementById('plat-color').value,
    textColor: document.getElementById('plat-textColor').value,
    icon:      document.getElementById('plat-icon').value.trim() || '🛒',
  };
  if (!payload.id || !payload.name) { showToast('ID and name required', 'error'); return; }

  const data = await api.addPlatform(payload, TOKEN);
  if (data.success) {
    closeModal('platform-modal');
    await loadConfig();
    renderPlatformsList();
    populateModalDropdowns();
    showToast('✅ Platform added!', 'success');
  } else { showToast(data.error, 'error'); }
}

// ─── Settings ──────────────────────────────────────────────────────
function loadSettings() {
  if (!SITE_CONFIG) return;
  const f = id => { const el = document.getElementById(id); if (el) return el; };
  const set = (id, val) => { const el = f(id); if (el) el.value = val || ''; };

  set('cfg-siteName',     SITE_CONFIG.siteName);
  set('cfg-tagline',      SITE_CONFIG.tagline);
  set('cfg-announcement', SITE_CONFIG.announcement);
  set('cfg-footerText',   SITE_CONFIG.footerText);
  set('cfg-heroTitle',    SITE_CONFIG.heroTitle);
  set('cfg-heroSubtitle', SITE_CONFIG.heroSubtitle);
  set('cfg-heroCTA',      SITE_CONFIG.heroCTA);
  set('cfg-dealProductId',SITE_CONFIG.dealOfDayProductId);

  if (SITE_CONFIG.dealOfDayEndsAt) {
    const dt = new Date(SITE_CONFIG.dealOfDayEndsAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    set('cfg-dealEndsAt', local);
  }
}

async function saveSettings() {
  const endAt = document.getElementById('cfg-dealEndsAt').value;
  const payload = {
    siteName:            document.getElementById('cfg-siteName').value.trim(),
    tagline:             document.getElementById('cfg-tagline').value.trim(),
    announcement:        document.getElementById('cfg-announcement').value.trim(),
    footerText:          document.getElementById('cfg-footerText').value.trim(),
    heroTitle:           document.getElementById('cfg-heroTitle').value.trim(),
    heroSubtitle:        document.getElementById('cfg-heroSubtitle').value.trim(),
    heroCTA:             document.getElementById('cfg-heroCTA').value.trim(),
    dealOfDayProductId:  document.getElementById('cfg-dealProductId').value.trim(),
    dealOfDayEndsAt:     endAt ? new Date(endAt).toISOString() : undefined,
  };

  try {
    const data = await api.updateConfig(payload, TOKEN);
    if (data.success) {
      SITE_CONFIG = { ...SITE_CONFIG, ...data.config };
      showToast('✅ Settings saved!', 'success');
    } else { showToast(data.error, 'error'); }
  } catch (e) { showToast('Server error.', 'error'); }
}

async function changePassword() {
  const np = document.getElementById('cfg-newPassword').value;
  const cp = document.getElementById('cfg-confirmPassword').value;
  if (!np || np.length < 6) { showToast('Password must be at least 6 chars', 'warn'); return; }
  if (np !== cp) { showToast('Passwords do not match', 'error'); return; }

  const data = await api.changePassword(np, TOKEN);
  if (data.success) {
    document.getElementById('cfg-newPassword').value = '';
    document.getElementById('cfg-confirmPassword').value = '';
    showToast('✅ Password updated!', 'success');
  } else { showToast(data.error, 'error'); }
}

// ─── Modal Helpers ─────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─── Helpers ───────────────────────────────────────────────────────
function getPlatformInfo(id) {
  const platforms = SITE_CONFIG.platforms || [];
  return platforms.find(p => p.id === id) || { name: id, color: '#555', textColor: '#fff', icon: '🛒' };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
