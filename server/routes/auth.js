const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'agriconnect_super_secret_key_2024';
const genToken = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name, email: u.email }, SECRET, { expiresIn: '7d' });
const sanitize = (u) => {
  const { password, ...rest } = u;
  return { ...rest, location: { state: u.state, district: u.district, village: u.village }, primaryCrops: u.primaryCrops ? u.primaryCrops.split(',').filter(Boolean) : [] };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, language, location } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const result = db.prepare(
      `INSERT INTO users (name, email, password, role, phone, language, state, district, village) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(name, email, hashed, role || 'farmer', phone || '', language || 'en', location?.state || '', location?.district || '', location?.village || '');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, token: genToken(user), user: sanitize(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    res.json({ success: true, token: genToken(user), user: sanitize(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: sanitize(user) });
});

// PUT /api/auth/profile
router.put('/profile', protect, (req, res) => {
  const { name, phone, language, location, farmSize, primaryCrops, businessName, businessType } = req.body;
  db.prepare(`UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), language=COALESCE(?,language), state=COALESCE(?,state), district=COALESCE(?,district), village=COALESCE(?,village), farmSize=COALESCE(?,farmSize), primaryCrops=COALESCE(?,primaryCrops), businessName=COALESCE(?,businessName), businessType=COALESCE(?,businessType) WHERE id=?`)
    .run(name, phone, language, location?.state, location?.district, location?.village, farmSize, Array.isArray(primaryCrops) ? primaryCrops.join(',') : primaryCrops, businessName, businessType, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user: sanitize(user) });
});

// GET /api/auth/users (admin)
router.get('/users', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  const users = db.prepare('SELECT * FROM users').all().map(sanitize);
  res.json({ success: true, users });
});

module.exports = router;
