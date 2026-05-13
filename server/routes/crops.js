const express = require('express');
const { db } = require('../services/database');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// ──── MARKET PRICES (Admin-managed, stored in DB) ────

// GET /api/crops/market-prices — live prices from DB
router.get('/market-prices', (req, res) => {
  const prices = db.prepare(`SELECT mp.*, u.name as updatedByName FROM market_prices mp LEFT JOIN users u ON mp.updatedBy = u.id ORDER BY mp.cropName ASC`).all();
  res.json({ success: true, prices });
});

// POST /api/crops/market-prices — admin updates a price (creates history)
router.post('/market-prices', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admins can update market prices' });
  const { cropName, price, unit, market, state } = req.body;
  if (!cropName || !price) return res.status(400).json({ success: false, message: 'Crop name and price required' });

  // Upsert market price
  const existing = db.prepare('SELECT id FROM market_prices WHERE cropName = ? AND market = ?').get(cropName, market || '');
  if (existing) {
    db.prepare('UPDATE market_prices SET price = ?, unit = ?, state = ?, updatedBy = ?, updatedAt = datetime("now","localtime") WHERE id = ?')
      .run(Number(price), unit || 'kg', state || '', req.user.id, existing.id);
  } else {
    db.prepare('INSERT INTO market_prices (cropName, price, unit, market, state, updatedBy) VALUES (?,?,?,?,?,?)')
      .run(cropName, Number(price), unit || 'kg', market || '', state || '', req.user.id);
  }

  // Record in history for predictions
  db.prepare('INSERT INTO price_history (cropName, price, market) VALUES (?,?,?)').run(cropName, Number(price), market || '');

  res.json({ success: true, message: `Price updated: ${cropName} = ₹${price}/${unit || 'kg'}` });
});

// GET /api/crops/price-history/:crop — for predictions
router.get('/price-history/:crop', (req, res) => {
  const history = db.prepare('SELECT * FROM price_history WHERE cropName = ? ORDER BY recordedAt DESC LIMIT 90').all(req.params.crop);
  res.json({ success: true, history: history.reverse() });
});

// ──── ORDERS ────

// GET /api/crops/orders/my
router.get('/orders/my', protect, (req, res) => {
  let orders;
  if (req.user.role === 'buyer') {
    orders = db.prepare(`SELECT o.*, u.name as farmerName, u.phone as farmerPhone FROM orders o JOIN users u ON o.farmerId = u.id WHERE o.buyerId = ? ORDER BY o.createdAt DESC`).all(req.user.id);
  } else if (req.user.role === 'farmer') {
    orders = db.prepare(`SELECT o.*, u.name as buyerName, u.phone as buyerPhone FROM orders o JOIN users u ON o.buyerId = u.id WHERE o.farmerId = ? ORDER BY o.createdAt DESC`).all(req.user.id);
  } else {
    orders = db.prepare(`SELECT o.*, f.name as farmerName, b.name as buyerName FROM orders o JOIN users f ON o.farmerId = f.id JOIN users b ON o.buyerId = b.id ORDER BY o.createdAt DESC`).all();
  }
  res.json({ success: true, orders });
});

// PUT /api/crops/orders/:id/status — update order status
router.put('/orders/:id/status', protect, (req, res) => {
  const { status } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.farmerId !== req.user.id && order.buyerId !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorized' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (status === 'delivered') db.prepare("UPDATE crops SET status = 'sold' WHERE id = ?").run(order.cropId);
  if (status === 'cancelled') db.prepare("UPDATE crops SET status = 'available' WHERE id = ?").run(order.cropId);
  res.json({ success: true, message: `Order status updated to ${status}` });
});

// ──── MY CROPS ────

// GET /api/crops/my
router.get('/my', protect, (req, res) => {
  const crops = db.prepare('SELECT * FROM crops WHERE farmerId = ? ORDER BY createdAt DESC').all(req.user.id);
  res.json({ success: true, crops });
});

// ──── PUBLIC CROP LISTINGS ────

// GET /api/crops
router.get('/', (req, res) => {
  const { category, search, status } = req.query;
  let sql = 'SELECT c.*, u.name as farmerName, u.phone as farmerPhone, u.district as farmerDistrict, u.state as farmerState FROM crops c JOIN users u ON c.farmerId = u.id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  else { sql += " AND c.status = 'available'"; }
  if (category) { sql += ' AND c.category = ?'; params.push(category); }
  if (search) { sql += ' AND c.cropName LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY c.createdAt DESC';
  const crops = db.prepare(sql).all(...params);
  res.json({ success: true, crops, total: crops.length });
});

// GET /api/crops/:id
router.get('/:id', (req, res) => {
  const crop = db.prepare('SELECT c.*, u.name as farmerName, u.phone as farmerPhone, u.state as farmerState, u.district as farmerDistrict FROM crops c JOIN users u ON c.farmerId = u.id WHERE c.id = ?').get(req.params.id);
  if (!crop) return res.status(404).json({ success: false, message: 'Crop not found' });
  res.json({ success: true, crop });
});

// POST /api/crops
router.post('/', protect, (req, res) => {
  const { cropName, category, quantity, unit, pricePerUnit, quality, organic, description, location } = req.body;
  if (!cropName || !quantity || !pricePerUnit) return res.status(400).json({ success: false, message: 'Crop name, quantity, and price are required' });

  const result = db.prepare(`INSERT INTO crops (cropName, category, quantity, unit, pricePerUnit, quality, organic, harvestDate, farmerId, state, district, market, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(cropName, category || 'vegetable', Number(quantity), unit || 'kg', Number(pricePerUnit), quality || 'standard', organic ? 1 : 0, new Date().toISOString().split('T')[0], req.user.id, location?.state || '', location?.district || '', location?.market || '', description || '');

  const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, crop });
});

// PUT /api/crops/:id
router.put('/:id', protect, (req, res) => {
  const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
  if (!crop) return res.status(404).json({ success: false, message: 'Crop not found' });
  if (crop.farmerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
  const { cropName, category, quantity, unit, pricePerUnit, quality, organic, status, description } = req.body;
  db.prepare(`UPDATE crops SET cropName=COALESCE(?,cropName), category=COALESCE(?,category), quantity=COALESCE(?,quantity), unit=COALESCE(?,unit), pricePerUnit=COALESCE(?,pricePerUnit), quality=COALESCE(?,quality), organic=COALESCE(?,organic), status=COALESCE(?,status), description=COALESCE(?,description) WHERE id=?`)
    .run(cropName, category, quantity != null ? Number(quantity) : null, unit, pricePerUnit != null ? Number(pricePerUnit) : null, quality, organic != null ? (organic ? 1 : 0) : null, status, description, req.params.id);
  const updated = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
  res.json({ success: true, crop: updated });
});

// DELETE /api/crops/:id
router.delete('/:id', protect, (req, res) => {
  const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
  if (!crop) return res.status(404).json({ success: false, message: 'Crop not found' });
  if (crop.farmerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });
  db.prepare('DELETE FROM crops WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Crop deleted' });
});

// POST /api/crops/:id/order
router.post('/:id/order', protect, (req, res) => {
  const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
  if (!crop) return res.status(404).json({ success: false, message: 'Crop not found' });
  if (crop.status !== 'available') return res.status(400).json({ success: false, message: 'Crop is not available' });
  const qty = Number(req.body.quantity) || crop.quantity;
  const total = qty * crop.pricePerUnit;
  const result = db.prepare(`INSERT INTO orders (cropId, cropName, quantity, pricePerUnit, totalAmount, farmerId, buyerId, status) VALUES (?,?,?,?,?,?,?,?)`)
    .run(crop.id, crop.cropName, qty, crop.pricePerUnit, total, crop.farmerId, req.user.id, 'pending');
  db.prepare("UPDATE crops SET status = 'reserved' WHERE id = ?").run(crop.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, order });
});

module.exports = router;
