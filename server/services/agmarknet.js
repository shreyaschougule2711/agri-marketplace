const { db } = require('./database');
require('dotenv').config();

const API_KEY = process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd0000010ece24fd238a46494152129bd46db168';
const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

/**
 * Fetches live crop market prices from Agmarknet API and stores them in the DB.
 */
async function syncMarketPrices() {
  try {
    console.log('🔄 Fetching live market data from Agmarknet...');
    
    // Fetch latest 200 records to ensure we get a good variety of crops across markets
    const url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=500`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    if (!data.records || !data.records.length) {
      console.log('⚠️ No records found from Agmarknet.');
      return;
    }

    let updatedCount = 0;

    const insertHistory = db.prepare(`
      INSERT INTO price_history (cropName, price, market) 
      VALUES (?, ?, ?)
    `);

    // We will keep only one price per commodity for simplicity (latest updated or average if we wanted)
    // Here we just pick the first one we see per commodity to represent the current "market price" broadly.
    const seenCrops = new Set();

    db.transaction(() => {
      for (const record of data.records) {
        const crop = record.commodity;
        
        // Modal price is usually per quintal (100 kg), we'll convert to per kg.
        // If price is unusually low, maybe it's already per kg, but usually it's per quintal.
        let pricePerKg = record.modal_price / 100; 
        
        // Sometimes prices are 0 or null, skip them
        if (!pricePerKg || pricePerKg <= 0) continue;

        if (!seenCrops.has(crop)) {
          seenCrops.add(crop);
          
          // Agmarknet schema: no UNIQUE constraint on cropName right now.
          // Let's manually check existing and update or insert to avoid duplicates in display.
          const existing = db.prepare('SELECT id FROM market_prices WHERE cropName = ?').get(crop);
          if (existing) {
             db.prepare('UPDATE market_prices SET price = ?, unit = ?, market = ?, state = ?, updatedAt = datetime(\'now\',\'localtime\') WHERE id = ?')
               .run(pricePerKg, 'kg', record.market, record.state, existing.id);
          } else {
             db.prepare('INSERT INTO market_prices (cropName, price, unit, market, state) VALUES (?, ?, ?, ?, ?)')
               .run(crop, pricePerKg, 'kg', record.market, record.state);
          }

          insertHistory.run(crop, pricePerKg, record.market);
          updatedCount++;
        }
      }
    })();

    console.log(`✅ Agmarknet sync complete. Updated ${updatedCount} crops.`);
  } catch (err) {
    console.error('❌ Failed to sync Agmarknet data:', err.message);
  }
}

// Call initially, then every 6 hours
setTimeout(syncMarketPrices, 2000);
setInterval(syncMarketPrices, 6 * 60 * 60 * 1000);

module.exports = { syncMarketPrices };
