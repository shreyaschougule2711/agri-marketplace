const express = require('express');
const { db, admin } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ──── MARKET PRICES ────

router.get('/market-prices', async (req, res) => {
  try {
    const snapshot = await db.collection('market_prices').orderBy('cropName', 'asc').get();
    const prices = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      let updatedByName = null;
      if (data.updatedBy) {
        const uDoc = await db.collection('users').doc(data.updatedBy).get();
        if (uDoc.exists) updatedByName = uDoc.data().name;
      }
      
      const updatedAt = data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt;
      
      return { id: doc.id, ...data, updatedAt, updatedByName };
    }));
    res.json({ success: true, prices });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/market-prices', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admins can update market prices' });
    const { cropName, price, unit, market, state } = req.body;
    if (!cropName || !price) return res.status(400).json({ success: false, message: 'Crop name and price required' });

    const mpRef = db.collection('market_prices');
    const existing = await mpRef.where('cropName', '==', cropName).where('market', '==', market || '').limit(1).get();
    
    if (!existing.empty) {
      await mpRef.doc(existing.docs[0].id).update({
        price: Number(price),
        unit: unit || 'kg',
        state: state || '',
        updatedBy: req.user.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await mpRef.add({
        cropName,
        price: Number(price),
        unit: unit || 'kg',
        market: market || '',
        state: state || '',
        updatedBy: req.user.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await db.collection('price_history').add({
      cropName,
      price: Number(price),
      market: market || '',
      recordedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `Price updated: ${cropName} = ₹${price}/${unit || 'kg'}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/price-history/:crop', async (req, res) => {
  try {
    const snapshot = await db.collection('price_history').where('cropName', '==', req.params.crop).get();
    let history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    history.sort((a, b) => {
      const tA = a.recordedAt && a.recordedAt.toDate ? a.recordedAt.toDate().getTime() : new Date(a.recordedAt || 0).getTime();
      const tB = b.recordedAt && b.recordedAt.toDate ? b.recordedAt.toDate().getTime() : new Date(b.recordedAt || 0).getTime();
      return tB - tA; // desc
    });
    res.json({ success: true, history: history.slice(0, 90).reverse() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ──── ORDERS ────

router.get('/orders/my', protect, async (req, res) => {
  try {
    let query = db.collection('orders');
    if (req.user.role === 'buyer') {
      query = query.where('buyerId', '==', req.user.id);
    } else if (req.user.role === 'farmer') {
      query = query.where('farmerId', '==', req.user.id);
    }

    const snapshot = await query.get();
    let orders = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      let farmerName, farmerPhone, buyerName, buyerPhone;
      
      if (data.farmerId) {
        const fDoc = await db.collection('users').doc(data.farmerId).get();
        if (fDoc.exists) { farmerName = fDoc.data().name; farmerPhone = fDoc.data().phone; }
      }
      if (data.buyerId) {
        const bDoc = await db.collection('users').doc(data.buyerId).get();
        if (bDoc.exists) { buyerName = bDoc.data().name; buyerPhone = bDoc.data().phone; }
      }
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
      return { id: doc.id, ...data, createdAt, farmerName, farmerPhone, buyerName, buyerPhone };
    }));
    
    orders.sort((a, b) => {
      const tA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      const tB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return tB - tA;
    });
    
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/orders/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderDoc.data();
    
    if (order.farmerId !== req.user.id && order.buyerId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await orderRef.update({ status });
    if (status === 'delivered') await db.collection('crops').doc(order.cropId).update({ status: 'sold' });
    if (status === 'cancelled') await db.collection('crops').doc(order.cropId).update({ status: 'available' });
    
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ──── CROPS ────

router.get('/my', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('crops').where('farmerId', '==', req.user.id).get();
    let crops = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
      return { id: doc.id, ...data, createdAt };
    });
    crops.sort((a, b) => {
      const tA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      const tB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return tB - tA;
    });
    res.json({ success: true, crops });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = db.collection('crops');
    query = query.where('status', '==', status || 'available');
    if (category) query = query.where('category', '==', category);
    
    const snapshot = await query.get();
    let crops = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      let farmerName, farmerState, farmerDistrict;
      if (data.farmerId) {
        const uDoc = await db.collection('users').doc(data.farmerId).get();
        if (uDoc.exists) {
          farmerName = uDoc.data().name;
          farmerState = uDoc.data().state;
          farmerDistrict = uDoc.data().district;
        }
      }
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
      return { id: doc.id, ...data, createdAt, farmerName, location: `${farmerDistrict || ''}, ${farmerState || ''}` };
    }));

    crops.sort((a, b) => {
      const tA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      const tB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return tB - tA;
    });

    if (search) {
      const s = search.toLowerCase();
      crops = crops.filter(c => c.cropName.toLowerCase().includes(s));
    }

    res.json({ success: true, crops, total: crops.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('crops').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Crop not found' });
    
    const crop = { id: doc.id, ...doc.data() };
    if (crop.farmerId) {
      const uDoc = await db.collection('users').doc(crop.farmerId).get();
      if (uDoc.exists) {
        const uData = uDoc.data();
        crop.farmerName = uData.name; crop.farmerPhone = uData.phone;
        crop.farmerState = uData.state; crop.farmerDistrict = uData.district;
      }
    }
    res.json({ success: true, crop });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { cropName, category, quantity, unit, pricePerUnit, quality, organic, description, location } = req.body;
    if (!cropName || !quantity || !pricePerUnit) return res.status(400).json({ success: false, message: 'Crop name, quantity, and price are required' });

    const newCrop = {
      cropName,
      category: category || 'vegetable',
      quantity: Number(quantity),
      unit: unit || 'kg',
      pricePerUnit: Number(pricePerUnit),
      quality: quality || 'standard',
      status: 'available',
      organic: organic ? 1 : 0,
      harvestDate: new Date().toISOString().split('T')[0],
      farmerId: req.user.id,
      state: location?.state || '',
      district: location?.district || '',
      market: location?.market || '',
      description: description || '',
      images: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('crops').add(newCrop);
    res.status(201).json({ success: true, crop: { id: docRef.id, ...newCrop } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const cropRef = db.collection('crops').doc(req.params.id);
    const cropDoc = await cropRef.get();
    if (!cropDoc.exists) return res.status(404).json({ success: false, message: 'Crop not found' });
    
    if (cropDoc.data().farmerId !== req.user.id && req.user.role !== 'admin') 
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const { cropName, category, quantity, unit, pricePerUnit, quality, organic, status, description } = req.body;
    const updates = {};
    if (cropName !== undefined) updates.cropName = cropName;
    if (category !== undefined) updates.category = category;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (unit !== undefined) updates.unit = unit;
    if (pricePerUnit !== undefined) updates.pricePerUnit = Number(pricePerUnit);
    if (quality !== undefined) updates.quality = quality;
    if (organic !== undefined) updates.organic = organic ? 1 : 0;
    if (status !== undefined) updates.status = status;
    if (description !== undefined) updates.description = description;

    await cropRef.update(updates);
    const updated = await cropRef.get();
    res.json({ success: true, crop: { id: updated.id, ...updated.data() } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const cropRef = db.collection('crops').doc(req.params.id);
    const cropDoc = await cropRef.get();
    if (!cropDoc.exists) return res.status(404).json({ success: false, message: 'Crop not found' });
    
    if (cropDoc.data().farmerId !== req.user.id && req.user.role !== 'admin') 
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await cropRef.delete();
    res.json({ success: true, message: 'Crop deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/order', protect, async (req, res) => {
  try {
    const cropRef = db.collection('crops').doc(req.params.id);
    const cropDoc = await cropRef.get();
    if (!cropDoc.exists) return res.status(404).json({ success: false, message: 'Crop not found' });
    
    const crop = cropDoc.data();
    if (crop.status !== 'available') return res.status(400).json({ success: false, message: 'Crop is not available' });

    const qty = Number(req.body.quantity) || crop.quantity;
    const total = qty * crop.pricePerUnit;
    
    const newOrder = {
      cropId: cropDoc.id,
      cropName: crop.cropName,
      quantity: qty,
      pricePerUnit: crop.pricePerUnit,
      totalAmount: total,
      farmerId: crop.farmerId,
      buyerId: req.user.id,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(newOrder);
    await cropRef.update({ status: 'reserved' });
    
    res.status(201).json({ success: true, order: { id: orderRef.id, ...newOrder } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
