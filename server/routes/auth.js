const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, admin } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'agriconnect_super_secret_key_2024';
const genToken = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name, email: u.email }, SECRET, { expiresIn: '7d' });

const sanitize = (u) => {
  const { password, ...rest } = u;
  return { 
    ...rest, 
    location: { state: u.state || '', district: u.district || '', village: u.village || '' }, 
    primaryCrops: Array.isArray(u.primaryCrops) ? u.primaryCrops : (u.primaryCrops ? u.primaryCrops.split(',').filter(Boolean) : []) 
  };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, language, location } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

    const usersRef = db.collection('users');
    const existing = await usersRef.where('email', '==', email).limit(1).get();
    if (!existing.empty) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email,
      password: hashed,
      role: role || 'farmer',
      phone: phone || '',
      language: language || 'en',
      state: location?.state || '',
      district: location?.district || '',
      village: location?.village || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await usersRef.add(newUser);
    const user = { id: docRef.id, ...newUser };
    res.status(201).json({ success: true, token: genToken(user), user: sanitize(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    res.json({ success: true, token: genToken(user), user: sanitize(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: sanitize({ id: doc.id, ...doc.data() }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, language, location, farmSize, primaryCrops, businessName, businessType } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (language !== undefined) updates.language = language;
    if (location?.state !== undefined) updates.state = location.state;
    if (location?.district !== undefined) updates.district = location.district;
    if (location?.village !== undefined) updates.village = location.village;
    if (farmSize !== undefined) updates.farmSize = farmSize;
    if (primaryCrops !== undefined) updates.primaryCrops = Array.isArray(primaryCrops) ? primaryCrops.join(',') : primaryCrops;
    if (businessName !== undefined) updates.businessName = businessName;
    if (businessType !== undefined) updates.businessType = businessType;

    const userRef = db.collection('users').doc(req.user.id);
    await userRef.update(updates);
    const doc = await userRef.get();
    res.json({ success: true, user: sanitize({ id: doc.id, ...doc.data() }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/auth/users (admin)
router.get('/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => sanitize({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
