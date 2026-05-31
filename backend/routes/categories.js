const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

const categoriesPath = path.join(__dirname, '../data/categories.json');

function readCategories() {
  return JSON.parse(fs.readFileSync(categoriesPath, 'utf-8')).categories;
}
function writeCategories(categories) {
  fs.writeFileSync(categoriesPath, JSON.stringify({ categories }, null, 2));
}

// GET /api/categories (public)
router.get('/', (req, res) => {
  const categories = readCategories();
  res.json({ success: true, categories: categories.filter(c => c.active) });
});

// GET /api/categories/all (admin)
router.get('/all', auth, (req, res) => {
  res.json({ success: true, categories: readCategories() });
});

// POST /api/categories (admin)
router.post('/', auth, (req, res) => {
  const categories = readCategories();
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });

  const newCat = { id: 'cat-' + uuidv4().slice(0, 6), name, icon: icon || '🏷️', active: true };
  categories.push(newCat);
  writeCategories(categories);
  res.status(201).json({ success: true, category: newCat });
});

// PUT /api/categories/:id (admin)
router.put('/:id', auth, (req, res) => {
  const categories = readCategories();
  const idx = categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found.' });
  categories[idx] = { ...categories[idx], ...req.body };
  writeCategories(categories);
  res.json({ success: true, category: categories[idx] });
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', auth, (req, res) => {
  let categories = readCategories();
  const idx = categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found.' });
  categories.splice(idx, 1);
  writeCategories(categories);
  res.json({ success: true, message: 'Category deleted.' });
});

module.exports = router;
