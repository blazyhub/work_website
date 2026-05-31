const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

const productsPath = path.join(__dirname, '../data/products.json');

function readProducts() {
  return JSON.parse(fs.readFileSync(productsPath, 'utf-8')).products;
}

function writeProducts(products) {
  fs.writeFileSync(productsPath, JSON.stringify({ products }, null, 2));
}

// GET /api/products  (public)
router.get('/', (req, res) => {
  let products = readProducts();
  const { category, platform, featured, search, active } = req.query;

  // By default only return active products for public
  if (active !== 'all') {
    products = products.filter(p => p.active);
  }
  if (category && category !== 'all') {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (platform && platform !== 'all') {
    products = products.filter(p => p.platform.toLowerCase() === platform.toLowerCase());
  }
  if (featured === 'true') {
    products = products.filter(p => p.featured);
  }
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: products.length, products });
});

// GET /api/products/:id  (public)
router.get('/:id', (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true, product });
});

// POST /api/products  (admin)
router.post('/', auth, (req, res) => {
  const products = readProducts();
  const {
    title, description, image, category, platform,
    mrp, salePrice, discount, affiliateLink, badge, featured, active
  } = req.body;

  if (!title || !platform || !mrp || !affiliateLink) {
    return res.status(400).json({ error: 'title, platform, mrp, and affiliateLink are required.' });
  }

  const computedDiscount = discount !== undefined
    ? Number(discount)
    : Math.round(((mrp - salePrice) / mrp) * 100);

  const newProduct = {
    id: 'prod-' + uuidv4().slice(0, 8),
    title,
    description: description || '',
    image: image || '',
    category: category || 'General',
    platform,
    mrp: Number(mrp),
    salePrice: salePrice !== undefined ? Number(salePrice) : Number(mrp),
    discount: computedDiscount,
    affiliateLink,
    badge: badge || '',
    featured: featured === true || featured === 'true',
    active: active !== false && active !== 'false',
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);
  writeProducts(products);

  res.status(201).json({ success: true, product: newProduct });
});

// PUT /api/products/:id  (admin)
router.put('/:id', auth, (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  const updated = { ...products[index], ...req.body };

  // Recalculate discount if mrp/salePrice changed but discount not explicitly given
  if ((req.body.mrp || req.body.salePrice) && req.body.discount === undefined) {
    const mrp = Number(updated.mrp);
    const salePrice = Number(updated.salePrice);
    updated.discount = mrp > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  }

  // If discount % given explicitly, recalculate salePrice
  if (req.body.discount !== undefined && req.body.salePrice === undefined) {
    const mrp = Number(updated.mrp);
    updated.salePrice = Math.round(mrp - (mrp * Number(req.body.discount)) / 100);
    updated.discount = Number(req.body.discount);
  }

  updated.mrp = Number(updated.mrp);
  updated.salePrice = Number(updated.salePrice);
  updated.discount = Number(updated.discount);

  products[index] = updated;
  writeProducts(products);

  res.json({ success: true, product: updated });
});

// DELETE /api/products/:id  (admin)
router.delete('/:id', auth, (req, res) => {
  let products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  products.splice(index, 1);
  writeProducts(products);

  res.json({ success: true, message: 'Product deleted.' });
});

module.exports = router;
