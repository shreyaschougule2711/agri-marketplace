const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/groups
router.get('/', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups_table ORDER BY createdAt DESC').all();
  const enriched = groups.map(g => {
    const members = db.prepare('SELECT gm.*, u.name as userName FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ?').all(g.id);
    return { ...g, members, memberCount: members.length, progress: Math.round((g.totalQuantity / g.targetQuantity) * 100), location: { state: g.state, district: g.district } };
  });
  res.json({ success: true, groups: enriched });
});

// GET /api/groups/:id
router.get('/:id', (req, res) => {
  const g = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ success: false, message: 'Group not found' });
  const members = db.prepare('SELECT gm.*, u.name as userName FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ?').all(g.id);
  const messages = db.prepare('SELECT gm.*, u.name as senderName FROM group_messages gm JOIN users u ON gm.senderId = u.id WHERE gm.groupId = ? ORDER BY gm.timestamp ASC').all(g.id);
  res.json({ success: true, group: { ...g, members, memberCount: members.length, progress: Math.round((g.totalQuantity / g.targetQuantity) * 100), location: { state: g.state, district: g.district } }, messages });
});

// POST /api/groups
router.post('/', protect, (req, res) => {
  const { groupName, cropType, targetQuantity, pricePerUnit, description } = req.body;
  if (!groupName || !cropType || !targetQuantity) return res.status(400).json({ success: false, message: 'Group name, crop type, and target quantity required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const result = db.prepare(`INSERT INTO groups_table (groupName, cropType, totalQuantity, targetQuantity, pricePerUnit, status, state, district, description, createdBy) VALUES (?,?,0,?,?,?,?,?,?,?)`)
    .run(groupName, cropType, Number(targetQuantity), Number(pricePerUnit) || 0, 'forming', user?.state || '', user?.district || '', description || '', req.user.id);

  const gid = result.lastInsertRowid;
  db.prepare('INSERT INTO group_members (groupId, userId, quantity) VALUES (?,?,0)').run(gid, req.user.id);
  db.prepare('INSERT INTO group_messages (groupId, senderId, text) VALUES (?,?,?)').run(gid, req.user.id, `Group "${groupName}" created! Let's sell ${cropType} together.`);

  const group = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(gid);
  res.status(201).json({ success: true, group: { ...group, memberCount: 1, progress: 0, location: { state: group.state, district: group.district } } });
});

// POST /api/groups/:id/join
router.post('/:id/join', protect, (req, res) => {
  const g = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ success: false, message: 'Group not found' });

  const already = db.prepare('SELECT id FROM group_members WHERE groupId = ? AND userId = ?').get(g.id, req.user.id);
  if (already) return res.status(400).json({ success: false, message: 'Already a member' });

  const qty = Number(req.body.quantity) || 0;
  db.prepare('INSERT INTO group_members (groupId, userId, quantity) VALUES (?,?,?)').run(g.id, req.user.id, qty);
  db.prepare('UPDATE groups_table SET totalQuantity = totalQuantity + ? WHERE id = ?').run(qty, g.id);
  db.prepare('INSERT INTO group_messages (groupId, senderId, text) VALUES (?,?,?)').run(g.id, req.user.id, `Joined the group with ${qty}kg!`);

  const updated = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(g.id);
  const members = db.prepare('SELECT gm.*, u.name as userName FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ?').all(g.id);
  res.json({ success: true, message: `Joined with ${qty}kg!`, group: { ...updated, members, memberCount: members.length, progress: Math.round((updated.totalQuantity / updated.targetQuantity) * 100) } });
});

// POST /api/groups/:id/message
router.post('/:id/message', protect, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Message text required' });

  db.prepare('INSERT INTO group_messages (groupId, senderId, text) VALUES (?,?,?)').run(req.params.id, req.user.id, text);
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, message: { senderId: req.user.id, senderName: user?.name, text, timestamp: new Date().toISOString() } });
});

// GET /api/groups/:id/messages
router.get('/:id/messages', (req, res) => {
  const messages = db.prepare('SELECT gm.*, u.name as senderName FROM group_messages gm JOIN users u ON gm.senderId = u.id WHERE gm.groupId = ? ORDER BY gm.timestamp ASC').all(req.params.id);
  res.json({ success: true, messages });
});

module.exports = router;
