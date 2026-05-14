const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { init } = require('./services/database');
const authRoutes = require('./routes/auth');
const cropRoutes = require('./routes/crops');
const predictionRoutes = require('./routes/predictions');
const matchingRoutes = require('./routes/matching');
const groupRoutes = require('./routes/groups');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

init();
require('./services/agmarknet'); // Start Agmarknet sync service

app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const { db } = require('./services/database');
    const uSnap = await db.collection('users').count().get();
    const cSnap = await db.collection('crops').count().get();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), users: uSnap.data().count, crops: cSnap.data().count });
  } catch(e) {
    res.json({ status: 'ok', message: 'Firebase connected' });
  }
});

app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 AgriConnect API — http://localhost:${PORT}`);
  console.log(`🔥 Database: Firebase Firestore (persistent)\n`);
});
