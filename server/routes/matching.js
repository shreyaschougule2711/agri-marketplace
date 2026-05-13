const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/matching/find-buyers — farmer finds real buyers from DB
router.post('/find-buyers', protect, (req, res) => {
  const { cropType, quantity, priceExpected } = req.body;
  const buyers = db.prepare("SELECT id, name, phone, state, district, businessName, businessType FROM users WHERE role = 'buyer'").all();

  if (buyers.length === 0) return res.json({ success: true, buyers: [], message: 'No buyers registered on the platform yet.' });

  // Score based on location match and order history
  const results = buyers.map(b => {
    const farmer = db.prepare('SELECT state, district FROM users WHERE id = ?').get(req.user.id);
    const locationMatch = (b.state === farmer?.state) ? 20 : 0;
    const districtMatch = (b.district === farmer?.district) ? 15 : 0;
    const orderHistory = db.prepare('SELECT COUNT(*) as c FROM orders WHERE buyerId = ?').get(b.id).c;
    const score = Math.min(99, 50 + locationMatch + districtMatch + orderHistory * 5);

    return {
      id: b.id, name: b.name, businessName: b.businessName || b.name,
      type: b.businessType || 'Buyer', phone: b.phone,
      location: { state: b.state, district: b.district },
      matchScore: score,
      orderHistory,
      sameState: b.state === farmer?.state,
      sameDistrict: b.district === farmer?.district
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ success: true, buyers: results, totalMatches: results.length });
});

// POST /api/matching/find-crops — buyer finds real crop listings
router.post('/find-crops', protect, (req, res) => {
  const { cropType, maxPrice, category } = req.body;
  let sql = "SELECT c.*, u.name as farmerName, u.phone as farmerPhone, u.state as farmerState, u.district as farmerDistrict FROM crops c JOIN users u ON c.farmerId = u.id WHERE c.status = 'available'";
  const params = [];
  if (cropType) { sql += ' AND c.cropName LIKE ?'; params.push(`%${cropType}%`); }
  if (maxPrice) { sql += ' AND c.pricePerUnit <= ?'; params.push(Number(maxPrice)); }
  if (category) { sql += ' AND c.category = ?'; params.push(category); }
  sql += ' ORDER BY c.createdAt DESC';

  const crops = db.prepare(sql).all(...params);

  if (crops.length === 0) return res.json({ success: true, listings: [], message: 'No matching crops found. Try different filters.' });

  const buyer = db.prepare('SELECT state, district FROM users WHERE id = ?').get(req.user.id);
  const results = crops.map(c => {
    const locScore = (c.farmerState === buyer?.state ? 20 : 0) + (c.farmerDistrict === buyer?.district ? 15 : 0);
    const qualScore = c.quality === 'premium' ? 10 : c.quality === 'standard' ? 5 : 0;
    return {
      id: c.id, farmerName: c.farmerName, farmerPhone: c.farmerPhone,
      crop: c.cropName, quantity: c.quantity, price: c.pricePerUnit, unit: c.unit,
      quality: c.quality, organic: !!c.organic, category: c.category,
      location: `${c.farmerDistrict}, ${c.farmerState}`,
      matchScore: Math.min(99, 50 + locScore + qualScore),
      description: c.description
    };
  });
  results.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ success: true, listings: results, totalMatches: results.length });
});

module.exports = router;
