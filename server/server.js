const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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

app.get('/api/health', (req, res) => {
  const { db } = require('./services/database');
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const crops = db.prepare('SELECT COUNT(*) as c FROM crops').get().c;
  res.json({ status: 'ok', timestamp: new Date().toISOString(), users, crops });
});

app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 AgriConnect API — http://localhost:${PORT}`);
  console.log(`💾 Database: server/agriconnect.db (persistent)\n`);
});
