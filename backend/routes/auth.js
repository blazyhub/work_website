const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '../data/config.json');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (password !== config.adminPassword) {
    return res.status(401).json({ error: 'Invalid password.' });
  }

  const token = jwt.sign(
    { role: 'admin', loginAt: Date.now() },
    config.jwtSecret,
    { expiresIn: '12h' }
  );

  // Set secure token in cookie
  res.cookie('dh_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: '/'
  });

  res.json({ success: true, token, expiresIn: '12h' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('dh_admin_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.adminPassword = newPassword;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = router;
