const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper to check if request is authenticated
function checkAdminAuth(req) {
  const cookies = req.headers.cookie;
  const token = cookies && cookies.split(';').map(c => c.trim()).find(c => c.startsWith('dh_admin_token='))?.split('=')[1];
  if (!token) return false;
  try {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/config.json'), 'utf-8'));
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch (e) {
    return false;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Admin Security Gate ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const isTargetResource = 
    req.path === '/admin' || 
    req.path === '/admin.html' || 
    req.path === '/js/admin.js';

  if (isTargetResource) {
    if (!checkAdminAuth(req)) {
      if (req.path === '/js/admin.js') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.redirect('/admin/login');
    }
  }
  next();
});

// ─── Serve Static Frontend ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/config',     require('./routes/config'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
});

// ─── SPA Fallback & Admin Serving ─────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/admin/login', (req, res) => {
  if (checkAdminAuth(req)) {
    res.redirect('/admin');
  } else {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🚀 DealHunt Affiliate Platform');
  console.log(`   Server running at: http://localhost:${PORT}`);
  console.log(`   Admin panel:        http://localhost:${PORT}/admin`);
  console.log(`   API base:           http://localhost:${PORT}/api`);
  console.log(`   Default password:   admin123\n`);
});
