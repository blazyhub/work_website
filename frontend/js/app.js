/* ═══════════════════════════════════════════════════════════════════
   DealHunt — Storefront App Logic
═══════════════════════════════════════════════════════════════════ */

let allProducts    = [];
let filteredProducts = [];
let siteConfig     = {};
let activePlatform = 'all';
let activeCategory = 'all';
let searchQuery    = '';

// ─── Init ──────────────────────────────────────────────────────────
async function init() {
  showSkeletons();                          // show animated skeletons immediately
  await loadConfig();                       // config first (platform colours needed for cards)
  await Promise.all([loadCategories(), loadProducts()]);
  startCountdown();
}

// ─── Skeleton placeholders (real animated CSS skeletons) ───────────
function showSkeletons() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array(8).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text-sm"></div>
    </div>`).join('');
  document.getElementById('products-count').textContent = 'Loading deals...';
}

// ─── Load Config ───────────────────────────────────────────────────
async function loadConfig() {
  try {
    const data = await api.getConfig();
    if (!data.success) return;
    siteConfig = data.config;

    const name = siteConfig.siteName || 'DealHunt';
    document.getElementById('site-logo').innerHTML =
      name.slice(0, -4) + `<span>${name.slice(-4)}</span>`;
    document.title = `${name} — Best Affiliate Deals`;

    if (siteConfig.heroTitle)    document.getElementById('hero-title').textContent    = siteConfig.heroTitle;
    if (siteConfig.heroSubtitle) document.getElementById('hero-subtitle').textContent = siteConfig.heroSubtitle;
    if (siteConfig.announcement) document.getElementById('announcement-text').textContent = siteConfig.announcement;
    if (siteConfig.footerText)   document.getElementById('footer-text').textContent   = siteConfig.footerText;

    const activePlatforms = (siteConfig.platforms || []).filter(p => p.active);
    document.getElementById('stat-platforms').textContent = activePlatforms.length + '+';
    buildPlatformChips(activePlatforms);
  } catch (e) {
    console.error('Config load error:', e);
  }
}

// ─── Build Platform Chips ──────────────────────────────────────────
function buildPlatformChips(platforms) {
  const container = document.getElementById('platform-chips');
  // preserve the "All" button
  const allBtn = container.querySelector('[data-platform="all"]') || (() => {
    const b = document.createElement('button');
    b.className = 'chip active'; b.dataset.platform = 'all'; b.textContent = '🛒 All Platforms';
    return b;
  })();

  container.innerHTML = '';
  container.appendChild(allBtn);

  allBtn.addEventListener('click', () => {
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    allBtn.classList.add('active');
    activePlatform = 'all';
    applyFilters();
  });

  platforms.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.platform = p.id;
    btn.innerHTML = `${p.icon} ${p.name}`;
    btn.addEventListener('click', () => setPlatformFilter(p.id, btn));
    container.appendChild(btn);
  });
}

// ─── Load Categories ───────────────────────────────────────────────
async function loadCategories() {
  try {
    const data = await api.getCategories();
    if (!data.success) return;

    const bar = document.getElementById('category-bar');
    const allBtn = bar.querySelector('[data-category="all"]') || (() => {
      const b = document.createElement('button');
      b.className = 'cat-chip active'; b.dataset.category = 'all'; b.textContent = 'All';
      return b;
    })();

    bar.innerHTML = '';
    bar.appendChild(allBtn);

    allBtn.addEventListener('click', () => {
      bar.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      allBtn.classList.add('active');
      activeCategory = 'all';
      applyFilters();
    });

    data.categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-chip';
      btn.dataset.category = cat.name;
      btn.textContent = `${cat.icon} ${cat.name}`;
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = cat.name;
        applyFilters();
      });
      bar.appendChild(btn);
    });

    document.getElementById('stat-categories').textContent = data.categories.length;
  } catch (e) {
    console.error('Categories load error:', e);
  }
}

// ─── Load Products from API ────────────────────────────────────────
async function loadProducts() {
  try {
    const data = await api.getProducts();   // only active products
    if (!data.success) throw new Error(data.error || 'API error');

    allProducts      = data.products;
    filteredProducts = [...allProducts];
    document.getElementById('stat-products').textContent = allProducts.length + '+';

    renderProducts(filteredProducts);
    loadDealOfDay();
    buildTickerRail(allProducts);
  } catch (e) {
    console.error('Products load error:', e);
    document.getElementById('products-grid').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load products</h3>
        <p>Make sure the backend server is running on port 3000.</p>
      </div>`;
    document.getElementById('products-count').textContent = '';
  }
}

// ─── Build Live Ticker Rail ────────────────────────────────────────
function buildTickerRail(products) {
  const rail = document.getElementById('deals-ticker-rail');
  const track = document.getElementById('ticker-track');
  if (!rail || !track) return;

  // Filter active products with discounts, sorted by newest first
  const discounted = products
    .filter(p => p.active && p.discount > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10); // take latest 10 products

  if (discounted.length === 0) {
    rail.style.display = 'none';
    return;
  }

  // Build list of ticker items
  const itemsHtml = discounted.map(p => {
    // Real image URL fallback handling
    const imgSrc = (p.image && p.image.trim())
      ? p.image
      : `https://placehold.co/40x40/161a27/ff9900?text=${encodeURIComponent(p.title.slice(0, 4))}`;

    const link = (p.affiliateLink && p.affiliateLink.trim() && p.affiliateLink !== '#')
      ? p.affiliateLink
      : '#';

    return `
      <a class="ticker-item" href="${link}" target="_blank" rel="noopener nofollow">
        <img class="ticker-item-img" src="${imgSrc}" alt="" onerror="this.src='https://placehold.co/40x40/161a27/ff9900?text=🏷️'" />
        <span>${escHtml(p.title.slice(0, 40))}${p.title.length > 40 ? '...' : ''}</span>
        <span class="ticker-item-badge">🔥 ${p.discount}% OFF</span>
      </a>
      <span class="ticker-item-sep">✦</span>
    `;
  }).join('');

  // Duplicate items for seamless continuous looping marquee!
  track.innerHTML = itemsHtml + itemsHtml;
  rail.style.display = 'flex';
}

// ─── Apply Filters ─────────────────────────────────────────────────
function applyFilters() {
  let result = [...allProducts];

  if (activePlatform !== 'all') {
    result = result.filter(p => p.platform === activePlatform);
  }
  if (activeCategory !== 'all') {
    result = result.filter(p => p.category === activeCategory);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.platform.toLowerCase().includes(q)
    );
  }

  filteredProducts = result;
  renderProducts(filteredProducts);
}

// ─── Set Platform Filter ───────────────────────────────────────────
function setPlatformFilter(platform, btn) {
  document.querySelectorAll('#platform-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  activePlatform = platform;
  applyFilters();
}

// ─── Render Products ───────────────────────────────────────────────
function renderProducts(products) {
  const grid  = document.getElementById('products-grid');
  const count = document.getElementById('products-count');

  if (allProducts.length === 0) {
    count.textContent = '0 deals';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔥</div>
        <h3>Exciting Deals Coming Soon!</h3>
        <p>We are hand-picking the absolute best discounts from Amazon, Flipkart, Meesho, and more. Check back shortly!</p>
      </div>`;
    return;
  }

  count.textContent = `Showing ${products.length} deal${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No deals found</h3>
        <p>Try a different search term, platform, or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => buildProductCard(p)).join('');
}

// ─── Build Product Card ────────────────────────────────────────────
function buildProductCard(p) {
  const pi = getPlatformInfo(p.platform);

  // Use a generic placeholder if no image is set
  const imgSrc = (p.image && p.image.trim())
    ? p.image
    : `https://placehold.co/300x300/161a27/ff9900?text=${encodeURIComponent(p.title.slice(0, 10))}`;

  // Affiliate link — show "#" only as fallback
  const link = (p.affiliateLink && p.affiliateLink.trim() && p.affiliateLink !== '#')
    ? p.affiliateLink
    : '#';

  return `
    <div class="product-card" id="card-${p.id}">
      <div class="card-image-wrap">
        <img src="${imgSrc}" alt="${escHtml(p.title)}" loading="lazy"
          onerror="this.src='https://placehold.co/300x300/161a27/ff9900?text=No+Image'" />
        <span class="card-platform-badge" style="background:${pi.color};color:${pi.textColor}">
          ${pi.icon} ${pi.name}
        </span>
        ${p.discount > 0 ? `<span class="card-discount-badge">${p.discount}% OFF</span>` : ''}
        ${p.badge ? `<span class="card-feature-badge">${escHtml(p.badge)}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(p.title)}</div>
        <div class="card-desc">${escHtml(p.description)}</div>
        <div class="card-price-row">
          <span class="card-sale-price">₹${formatPrice(p.salePrice)}</span>
          ${p.mrp > p.salePrice ? `<span class="card-mrp">₹${formatPrice(p.mrp)}</span>` : ''}
        </div>
        <a href="${link}" target="_blank" rel="noopener nofollow"
           class="card-cta cta-${p.platform}"
           onclick="trackClick('${p.id}', '${p.platform}')">
          Buy on ${pi.name} →
        </a>
      </div>
    </div>`;
}

// ─── Deal of the Day ───────────────────────────────────────────────
function loadDealOfDay() {
  const dealEl = document.getElementById('deal-section');
  const deal = (siteConfig.dealOfDayProductId
    ? allProducts.find(p => p.id === siteConfig.dealOfDayProductId)
    : null) || allProducts[0];

  if (!deal) {
    if (dealEl) dealEl.style.display = 'none';
    return;
  }

  if (dealEl) dealEl.style.display = 'block';

  document.getElementById('deal-title').textContent = deal.title;
  document.getElementById('deal-desc').textContent  = deal.description;
  document.getElementById('deal-sale').textContent  = '₹' + formatPrice(deal.salePrice);
  document.getElementById('deal-mrp').textContent   = '₹' + formatPrice(deal.mrp);
  document.getElementById('deal-off').textContent   = deal.discount + '% off';
  document.getElementById('deal-link').href         = deal.affiliateLink || '#';

  const img = document.getElementById('deal-image');
  if (deal.image && deal.image.trim()) {
    img.src = deal.image;
  } else {
    img.src = `https://placehold.co/400x400/161a27/ff9900?text=${encodeURIComponent(deal.title.slice(0,12))}`;
  }
  img.alt     = deal.title;
  img.onerror = () => { img.src = 'https://placehold.co/400x400/161a27/ff9900?text=Deal+of+Day'; };

  if (siteConfig.dealOfDayEndsAt) {
    window._dealEndTime = new Date(siteConfig.dealOfDayEndsAt).getTime();
  }
}

// ─── Countdown Timer ───────────────────────────────────────────────
function startCountdown() {
  function tick() {
    const endTime = window._dealEndTime || (Date.now() + 86400000);
    let diff = Math.max(0, endTime - Date.now());

    const hours = Math.floor(diff / 3600000); diff %= 3600000;
    const mins  = Math.floor(diff / 60000);   diff %= 60000;
    const secs  = Math.floor(diff / 1000);

    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-mins').textContent  = String(mins).padStart(2, '0');
    document.getElementById('cd-secs').textContent  = String(secs).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// ─── Search ────────────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  applyFilters();
});

document.getElementById('search-btn').addEventListener('click', () => {
  searchQuery = document.getElementById('search-input').value.trim();
  applyFilters();
  document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('search-btn').click();
});

// ─── Track Click ───────────────────────────────────────────────────
function trackClick(productId, platform) {
  // Future: send analytics ping
  console.log(`[DealHunt] Click: ${productId} → ${platform}`);
}

// ─── Helpers ───────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function getPlatformInfo(id) {
  const defaults = [
    { id: 'amazon',   name: 'Amazon',   color: '#ff9900', textColor: '#000', icon: '🔶' },
    { id: 'flipkart', name: 'Flipkart', color: '#2874F0', textColor: '#fff', icon: '🔵' },
    { id: 'meesho',   name: 'Meesho',   color: '#9B2D8E', textColor: '#fff', icon: '🟣' },
    { id: 'myntra',   name: 'Myntra',   color: '#FF3F6C', textColor: '#fff', icon: '🩷' },
    { id: 'ajio',     name: 'Ajio',     color: '#E8001C', textColor: '#fff', icon: '🔴' },
    { id: 'nykaa',    name: 'Nykaa',    color: '#FC2779', textColor: '#fff', icon: '💗' },
  ];
  const list = (siteConfig.platforms && siteConfig.platforms.length) ? siteConfig.platforms : defaults;
  return list.find(p => p.id === id) || { name: id, color: '#555', textColor: '#fff', icon: '🛒' };
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Secret Key Trick (Shortcut to Admin Panel) ────────────────────
let keysPressed = [];
window.addEventListener('keydown', e => {
  // Ignore shortcuts if user is actively typing in a form input or textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Option 1: Ctrl + Shift + A
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    window.location.href = '/admin';
  }

  // Option 2: Sequential cheat code - typing 'admin'
  keysPressed.push(e.key.toLowerCase());
  keysPressed = keysPressed.slice(-5); // Keep only last 5 characters
  if (keysPressed.join('') === 'admin') {
    window.location.href = '/admin';
  }
});

// ─── Boot ──────────────────────────────────────────────────────────
init();
