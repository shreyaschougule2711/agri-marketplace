const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/find-buyers', protect, async (req, res) => {
  try {
    const { cropType, quantity, priceExpected } = req.body;
    const buyersSnap = await db.collection('users').where('role', '==', 'buyer').get();
    
    if (buyersSnap.empty) return res.json({ success: true, buyers: [], message: 'No buyers registered on the platform yet.' });
    
    const farmerDoc = await db.collection('users').doc(req.user.id).get();
    const farmer = farmerDoc.exists ? farmerDoc.data() : null;

    const results = await Promise.all(buyersSnap.docs.map(async bDoc => {
      const b = bDoc.data();
      const locationMatch = (b.state === farmer?.state) ? 20 : 0;
      const districtMatch = (b.district === farmer?.district) ? 15 : 0;
      
      const ordersSnap = await db.collection('orders').where('buyerId', '==', bDoc.id).get();
      const orderHistory = ordersSnap.size;
      
      const score = Math.min(99, 50 + locationMatch + districtMatch + orderHistory * 5);

      return {
        id: bDoc.id, name: b.name, businessName: b.businessName || b.name,
        type: b.businessType || 'Buyer', phone: b.phone,
        location: { state: b.state, district: b.district },
        matchScore: score,
        orderHistory,
        sameState: b.state === farmer?.state,
        sameDistrict: b.district === farmer?.district
      };
    }));

    results.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ success: true, buyers: results, totalMatches: results.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/find-crops', protect, async (req, res) => {
  try {
    const { cropType, maxPrice, category } = req.body;
    let query = db.collection('crops').where('status', '==', 'available');
    
    if (category) query = query.where('category', '==', category);
    if (maxPrice) query = query.where('pricePerUnit', '<=', Number(maxPrice));

    const cropsSnap = await query.orderBy('pricePerUnit', 'asc').get();
    let crops = cropsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (cropType) {
      const c = cropType.toLowerCase();
      crops = crops.filter(crop => crop.cropName && crop.cropName.toLowerCase().includes(c));
    }

    if (crops.length === 0) return res.json({ success: true, listings: [], message: 'No matching crops found. Try different filters.' });

    const buyerDoc = await db.collection('users').doc(req.user.id).get();
    const buyer = buyerDoc.exists ? buyerDoc.data() : null;

    const results = await Promise.all(crops.map(async c => {
      let farmerName, farmerPhone, farmerState, farmerDistrict;
      if (c.farmerId) {
        const fDoc = await db.collection('users').doc(c.farmerId).get();
        if (fDoc.exists) {
          const fData = fDoc.data();
          farmerName = fData.name; farmerPhone = fData.phone;
          farmerState = fData.state; farmerDistrict = fData.district;
        }
      }

      const locScore = (farmerState === buyer?.state ? 20 : 0) + (farmerDistrict === buyer?.district ? 15 : 0);
      const qualScore = c.quality === 'premium' ? 10 : c.quality === 'standard' ? 5 : 0;
      
      return {
        id: c.id, farmerName, farmerPhone,
        crop: c.cropName, quantity: c.quantity, price: c.pricePerUnit, unit: c.unit,
        quality: c.quality, organic: !!c.organic, category: c.category,
        location: `${farmerDistrict || 'Unknown'}, ${farmerState || 'Unknown'}`,
        matchScore: Math.min(99, 50 + locScore + qualScore),
        description: c.description
      };
    }));

    results.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ success: true, listings: results, totalMatches: results.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
