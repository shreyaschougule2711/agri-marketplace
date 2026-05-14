const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let serviceAccount;

try {
  // If FIREBASE_CREDENTIALS is set as an env variable (e.g. on Render)
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    // Otherwise, try to read the local JSON file
    const localPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(localPath)) {
      serviceAccount = require(localPath);
    } else {
      throw new Error('No Firebase credentials found');
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('🔥 Firebase Admin initialized successfully');
} catch (err) {
  console.error('❌ Failed to initialize Firebase:', err.message);
}

const db = admin.firestore();

// Optional: Init default admin if users collection is empty
async function init() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.limit(1).get();
    
    if (snapshot.empty) {
      const hashed = await bcrypt.hash('admin@123', 10);
      await usersRef.add({
        name: 'Platform Admin',
        email: 'admin@agriconnect.in',
        password: hashed,
        role: 'admin',
        phone: '',
        language: 'en',
        state: '',
        district: '',
        village: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('🔑 Default admin created: admin@agriconnect.in / admin@123');
    }
  } catch (error) {
    console.error('Error in init:', error);
  }
}

module.exports = { db, init, admin };
