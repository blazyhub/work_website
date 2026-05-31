const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

const configPath = path.join(__dirname, '../data/config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// GET /api/config (public — omits sensitive fields)
router.get('/', (req, res) => {
  const config = readConfig();
  const { adminPassword, jwtSecret, ...publicConfig } = config;
  res.json({ success: true, config: publicConfig });
});

// PUT /api/config (admin)
router.put('/', auth, (req, res) => {
  const config = readConfig();
  const { jwtSecret, ...updates } = req.body; // never allow jwtSecret overwrite via API
  const updated = { ...config, ...updates };
  writeConfig(updated);
  const { adminPassword, jwtSecret: _, ...publicConfig } = updated;
  res.json({ success: true, config: publicConfig });
});

// PUT /api/config/platforms/:id (admin) — toggle platform active state
router.put('/platforms/:id', auth, (req, res) => {
  const config = readConfig();
  const idx = config.platforms.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Platform not found.' });
  config.platforms[idx] = { ...config.platforms[idx], ...req.body };
  writeConfig(config);
  res.json({ success: true, platform: config.platforms[idx] });
});

// POST /api/config/platforms (admin) — add new platform
router.post('/platforms', auth, (req, res) => {
  const config = readConfig();
  const { id, name, color, textColor, icon } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required.' });

  if (config.platforms.find(p => p.id === id)) {
    return res.status(400).json({ error: 'Platform with this id already exists.' });
  }

  const newPlatform = { id, name, color: color || '#333', textColor: textColor || '#fff', icon: icon || '🛒', active: true };
  config.platforms.push(newPlatform);
  writeConfig(config);
  res.status(201).json({ success: true, platform: newPlatform });
});

module.exports = router;
