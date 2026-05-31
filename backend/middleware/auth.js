const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '../data/config.json');

function authMiddleware(req, res, next) {
  // 1. Try Authorization Header
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // 2. Try Cookie if header not found
  if (!token && req.headers.cookie) {
    token = req.headers.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('dh_admin_token='))
      ?.split('=')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const decoded = jwt.verify(token, config.jwtSecret);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
