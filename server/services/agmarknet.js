const { db, admin } = require('./database');
require('dotenv').config();

const API_KEY = process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd0000010ece24fd238a46494152129bd46db168';
const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

async function syncMarketPrices() {
  try {
    console.log('🔄 Fetching live market data from Agmarknet...');
    const url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=500`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    if (!data.records || !data.records.length) {
      console.log('⚠️ No records found from Agmarknet.');
      return;
    }

    let updatedCount = 0;
    const seenCrops = new Set();
    const batch = db.batch();

    const mpSnap = await db.collection('market_prices').get();
    const existingPrices = {};
    mpSnap.forEach(doc => { existingPrices[doc.data().cropName] = doc.id; });

    for (const record of data.records) {
      const crop = record.commodity;
      let pricePerKg = record.modal_price / 100; 
      
      if (!pricePerKg || pricePerKg <= 0) continue;

      if (!seenCrops.has(crop)) {
        seenCrops.add(crop);
        
        const existingId = existingPrices[crop];
        if (existingId) {
           const docRef = db.collection('market_prices').doc(existingId);
           batch.update(docRef, {
             price: pricePerKg, unit: 'kg', market: record.market, state: record.state, updatedAt: admin.firestore.FieldValue.serverTimestamp()
           });
        } else {
           const docRef = db.collection('market_prices').doc();
           batch.set(docRef, {
             cropName: crop, price: pricePerKg, unit: 'kg', market: record.market, state: record.state, updatedAt: admin.firestore.FieldValue.serverTimestamp()
           });
        }

        const historyRef = db.collection('price_history').doc();
        batch.set(historyRef, {
          cropName: crop, price: pricePerKg, market: record.market, recordedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }
    console.log(`✅ Agmarknet sync complete. Updated ${updatedCount} crops.`);
  } catch (err) {
    console.error('❌ Failed to sync Agmarknet data:', err.message);
  }
}

setTimeout(syncMarketPrices, 2000);
setInterval(syncMarketPrices, 6 * 60 * 60 * 1000);

module.exports = { syncMarketPrices };
