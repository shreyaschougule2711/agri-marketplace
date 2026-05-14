const express = require('express');
const { db, admin } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const groupsSnap = await db.collection('groups_table').orderBy('createdAt', 'desc').get();
    const groups = await Promise.all(groupsSnap.docs.map(async doc => {
      const g = doc.data();
      const membersSnap = await db.collection('group_members').where('groupId', '==', doc.id).get();
      const members = await Promise.all(membersSnap.docs.map(async mDoc => {
        const m = mDoc.data();
        let userName;
        const uDoc = await db.collection('users').doc(m.userId).get();
        if (uDoc.exists) userName = uDoc.data().name;
        return { id: mDoc.id, ...m, userName };
      }));
      
      const target = g.targetQuantity || 1;
      const progress = Math.round(((g.totalQuantity || 0) / target) * 100);
      
      return { id: doc.id, ...g, members, memberCount: members.length, progress, location: { state: g.state, district: g.district } };
    }));
    res.json({ success: true, groups });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('groups_table').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Group not found' });
    const g = { id: doc.id, ...doc.data() };

    const membersSnap = await db.collection('group_members').where('groupId', '==', g.id).get();
    const members = await Promise.all(membersSnap.docs.map(async mDoc => {
      const m = mDoc.data();
      let userName;
      const uDoc = await db.collection('users').doc(m.userId).get();
      if (uDoc.exists) userName = uDoc.data().name;
      return { id: mDoc.id, ...m, userName };
    }));

    const msgsSnap = await db.collection('group_messages').where('groupId', '==', g.id).get();
    let msgsDocs = msgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    msgsDocs.sort((a, b) => {
      const tA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
      return tA - tB;
    });
    const messages = await Promise.all(msgsDocs.map(async msg => {
      let senderName;
      const uDoc = await db.collection('users').doc(msg.senderId).get();
      if (uDoc.exists) senderName = uDoc.data().name;
      return { ...msg, senderName };
    }));

    const target = g.targetQuantity || 1;
    const progress = Math.round(((g.totalQuantity || 0) / target) * 100);

    res.json({ success: true, group: { ...g, members, memberCount: members.length, progress, location: { state: g.state, district: g.district } }, messages });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { groupName, cropType, targetQuantity, pricePerUnit, description } = req.body;
    if (!groupName || !cropType || !targetQuantity) return res.status(400).json({ success: false, message: 'Group name, crop type, and target quantity required' });

    const uDoc = await db.collection('users').doc(req.user.id).get();
    const user = uDoc.exists ? uDoc.data() : null;

    const newGroup = {
      groupName, cropType, totalQuantity: 0, targetQuantity: Number(targetQuantity), 
      pricePerUnit: Number(pricePerUnit) || 0, status: 'forming',
      state: user?.state || '', district: user?.district || '', description: description || '',
      createdBy: req.user.id, createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const gRef = await db.collection('groups_table').add(newGroup);
    
    await db.collection('group_members').add({
      groupId: gRef.id, userId: req.user.id, quantity: 0, joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('group_messages').add({
      groupId: gRef.id, senderId: req.user.id, text: `Group "${groupName}" created! Let's sell ${cropType} together.`, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, group: { id: gRef.id, ...newGroup, memberCount: 1, progress: 0, location: { state: newGroup.state, district: newGroup.district } } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/join', protect, async (req, res) => {
  try {
    const gRef = db.collection('groups_table').doc(req.params.id);
    const gDoc = await gRef.get();
    if (!gDoc.exists) return res.status(404).json({ success: false, message: 'Group not found' });
    const g = gDoc.data();

    const already = await db.collection('group_members').where('groupId', '==', gDoc.id).where('userId', '==', req.user.id).limit(1).get();
    if (!already.empty) return res.status(400).json({ success: false, message: 'Already a member' });

    const qty = Number(req.body.quantity) || 0;
    await db.collection('group_members').add({
      groupId: gDoc.id, userId: req.user.id, quantity: qty, joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await gRef.update({ totalQuantity: admin.firestore.FieldValue.increment(qty) });
    
    await db.collection('group_messages').add({
      groupId: gDoc.id, senderId: req.user.id, text: `Joined the group with ${qty}kg!`, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await gRef.get();
    const updated = updatedDoc.data();

    const membersSnap = await db.collection('group_members').where('groupId', '==', gDoc.id).get();
    const members = await Promise.all(membersSnap.docs.map(async mDoc => {
      const m = mDoc.data();
      let userName;
      const uDoc = await db.collection('users').doc(m.userId).get();
      if (uDoc.exists) userName = uDoc.data().name;
      return { id: mDoc.id, ...m, userName };
    }));

    res.json({ success: true, message: `Joined with ${qty}kg!`, group: { id: gDoc.id, ...updated, members, memberCount: members.length, progress: Math.round(((updated.totalQuantity || 0) / (updated.targetQuantity || 1)) * 100) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/message', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Message text required' });

    await db.collection('group_messages').add({
      groupId: req.params.id, senderId: req.user.id, text, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const uDoc = await db.collection('users').doc(req.user.id).get();
    res.json({ success: true, message: { senderId: req.user.id, senderName: uDoc.exists ? uDoc.data().name : null, text, timestamp: new Date().toISOString() } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const msgsSnap = await db.collection('group_messages').where('groupId', '==', req.params.id).get();
    let msgsDocs = msgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    msgsDocs.sort((a, b) => {
      const tA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
      return tA - tB;
    });
    const messages = await Promise.all(msgsDocs.map(async msg => {
      let senderName;
      const uDoc = await db.collection('users').doc(msg.senderId).get();
      if (uDoc.exists) senderName = uDoc.data().name;
      return { ...msg, senderName };
    }));
    res.json({ success: true, messages });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
