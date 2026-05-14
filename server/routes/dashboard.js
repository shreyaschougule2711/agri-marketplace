const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', protect, async (req, res) => {
  try {
    const totalFarmers = (await db.collection('users').where('role', '==', 'farmer').count().get()).data().count;
    const totalBuyers = (await db.collection('users').where('role', '==', 'buyer').count().get()).data().count;
    const activeCrops = (await db.collection('crops').where('status', '==', 'available').count().get()).data().count;
    const totalOrders = (await db.collection('orders').count().get()).data().count;
    const totalUsers = (await db.collection('users').count().get()).data().count;
    const marketPriceCount = (await db.collection('market_prices').count().get()).data().count;
    
    // Revenue
    const ordersSnap = await db.collection('orders').where('status', '!=', 'cancelled').get();
    let revenue = 0;
    ordersSnap.forEach(doc => { revenue += doc.data().totalAmount || 0; });
    
    // Active Groups
    const groupsSnap = await db.collection('groups_table').where('status', 'in', ['forming','active','negotiating']).get();
    const activeGroups = groupsSnap.size;

    let myStats = {};
    if (req.user.role === 'farmer') {
      myStats.myListings = (await db.collection('crops').where('farmerId', '==', req.user.id).count().get()).data().count;
      myStats.myActiveListings = (await db.collection('crops').where('farmerId', '==', req.user.id).where('status', '==', 'available').count().get()).data().count;
      
      const myOrdersSnap = await db.collection('orders').where('farmerId', '==', req.user.id).get();
      myStats.myOrders = myOrdersSnap.size;
      myStats.myRevenue = 0;
      myStats.pendingOrders = 0;
      myOrdersSnap.forEach(doc => {
        const d = doc.data();
        if (d.status !== 'cancelled') myStats.myRevenue += d.totalAmount || 0;
        if (d.status === 'pending') myStats.pendingOrders++;
      });
      
      myStats.myGroups = (await db.collection('group_members').where('userId', '==', req.user.id).count().get()).data().count;
    }
    if (req.user.role === 'buyer') {
      const myOrdersSnap = await db.collection('orders').where('buyerId', '==', req.user.id).get();
      myStats.myOrders = myOrdersSnap.size;
      myStats.mySpent = 0;
      myStats.pendingOrders = 0;
      myOrdersSnap.forEach(doc => {
        const d = doc.data();
        if (d.status !== 'cancelled') myStats.mySpent += d.totalAmount || 0;
        if (d.status === 'pending') myStats.pendingOrders++;
      });
    }

    // Top crops aggregation
    const allCropsSnap = await db.collection('crops').get();
    const cropStats = {};
    allCropsSnap.forEach(doc => {
      const d = doc.data();
      if (!cropStats[d.cropName]) cropStats[d.cropName] = { listings: 0, volume: 0 };
      cropStats[d.cropName].listings++;
      cropStats[d.cropName].volume += d.quantity || 0;
    });
    const topCrops = Object.keys(cropStats).map(name => ({
      cropName: name, ...cropStats[name]
    })).sort((a, b) => b.volume - a.volume).slice(0, 5);

    // Recent orders
    const recentOrdersSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(10).get();
    const recentOrders = await Promise.all(recentOrdersSnap.docs.map(async doc => {
      const d = doc.data();
      let farmerName, buyerName;
      if (d.farmerId) {
        const fDoc = await db.collection('users').doc(d.farmerId).get();
        if (fDoc.exists) farmerName = fDoc.data().name;
      }
      if (d.buyerId) {
        const bDoc = await db.collection('users').doc(d.buyerId).get();
        if (bDoc.exists) buyerName = bDoc.data().name;
      }
      const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt;
      return { id: doc.id, ...d, createdAt, farmerName, buyerName };
    }));

    // Recent users
    const recentUsersSnap = await db.collection('users').orderBy('createdAt', 'desc').limit(5).get();
    const recentUsers = recentUsersSnap.docs.map(doc => {
      const d = doc.data();
      const createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt;
      return { name: d.name, role: d.role, createdAt };
    });

    res.json({
      success: true,
      stats: { totalFarmers, totalBuyers, totalUsers, activeCrops, totalOrders, revenue, activeGroups, marketPriceCount, topCrops, recentOrders, recentUsers, ...myStats }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
