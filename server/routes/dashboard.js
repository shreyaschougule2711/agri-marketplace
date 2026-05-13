const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', protect, (req, res) => {
  const totalFarmers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='farmer'").get().c;
  const totalBuyers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='buyer'").get().c;
  const activeCrops = db.prepare("SELECT COUNT(*) as c FROM crops WHERE status='available'").get().c;
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(totalAmount),0) as r FROM orders WHERE status != 'cancelled'").get().r;
  const activeGroups = db.prepare("SELECT COUNT(*) as c FROM groups_table WHERE status IN ('forming','active','negotiating')").get().c;
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const marketPriceCount = db.prepare("SELECT COUNT(*) as c FROM market_prices").get().c;

  let myStats = {};
  if (req.user.role === 'farmer') {
    myStats.myListings = db.prepare("SELECT COUNT(*) as c FROM crops WHERE farmerId=?").get(req.user.id).c;
    myStats.myActiveListings = db.prepare("SELECT COUNT(*) as c FROM crops WHERE farmerId=? AND status='available'").get(req.user.id).c;
    myStats.myRevenue = db.prepare("SELECT COALESCE(SUM(totalAmount),0) as r FROM orders WHERE farmerId=? AND status != 'cancelled'").get(req.user.id).r;
    myStats.myOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE farmerId=?").get(req.user.id).c;
    myStats.myGroups = db.prepare("SELECT COUNT(*) as c FROM group_members WHERE userId=?").get(req.user.id).c;
    myStats.pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE farmerId=? AND status='pending'").get(req.user.id).c;
  }
  if (req.user.role === 'buyer') {
    myStats.myOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE buyerId=?").get(req.user.id).c;
    myStats.mySpent = db.prepare("SELECT COALESCE(SUM(totalAmount),0) as r FROM orders WHERE buyerId=? AND status != 'cancelled'").get(req.user.id).r;
    myStats.pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE buyerId=? AND status='pending'").get(req.user.id).c;
  }

  const topCrops = db.prepare("SELECT cropName, COUNT(*) as listings, SUM(quantity) as volume FROM crops GROUP BY cropName ORDER BY volume DESC LIMIT 5").all();
  const recentOrders = db.prepare("SELECT o.*, f.name as farmerName, b.name as buyerName FROM orders o JOIN users f ON o.farmerId = f.id JOIN users b ON o.buyerId = b.id ORDER BY o.createdAt DESC LIMIT 10").all();
  const recentUsers = db.prepare("SELECT name, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 5").all();

  res.json({
    success: true,
    stats: { totalFarmers, totalBuyers, totalUsers, activeCrops, totalOrders, revenue, activeGroups, marketPriceCount, topCrops, recentOrders, recentUsers, ...myStats }
  });
});

module.exports = router;
