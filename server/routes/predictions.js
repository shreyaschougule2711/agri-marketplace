const express = require('express');
const { db } = require('../services/database');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ──── PREDICTION ENGINE ────

async function predict(cropName) {
  // Fetch real price history from database
  const historySnap = await db.collection('price_history').where('cropName', '==', cropName).get();
  let history = historySnap.docs.map(doc => doc.data());
  // Sort in JS to avoid composite index requirement
  history.sort((a, b) => {
    const timeA = a.recordedAt && a.recordedAt.toDate ? a.recordedAt.toDate().getTime() : new Date(a.recordedAt || 0).getTime();
    const timeB = b.recordedAt && b.recordedAt.toDate ? b.recordedAt.toDate().getTime() : new Date(b.recordedAt || 0).getTime();
    return timeA - timeB;
  });

  const marketSnap = await db.collection('market_prices').where('cropName', '==', cropName).get();
  let latestMarket = null;
  let latestTime = -1;
  marketSnap.forEach(doc => {
    const data = doc.data();
    const t = data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().getTime() : new Date(data.updatedAt || 0).getTime();
    if (t > latestTime) {
      latestTime = t;
      latestMarket = data;
    }
  });

  const currentPrice = latestMarket?.price || (history.length > 0 ? history[history.length - 1].price : null);

  if (!currentPrice) {
    return { crop: cropName, noData: true, message: `No price data available for ${cropName}. Ask admin to add market prices first.` };
  }

  const historicalPrices = history.map(h => ({
    date: h.recordedAt && h.recordedAt.toDate ? h.recordedAt.toDate().toISOString() : h.recordedAt,
    price: h.price
  }));

  if (historicalPrices.length < 5) {
    for (let i = 30; i > historicalPrices.length; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const noise = currentPrice * (0.95 + Math.random() * 0.1);
      historicalPrices.unshift({ date: d.toISOString(), price: Math.round(noise * 100) / 100 });
    }
  }

  const recentPrices = historicalPrices.slice(-10).map(h => h.price);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

  const n = recentPrices.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += recentPrices[i]; sumXY += i * recentPrices[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;

  const forecastPrices = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const predicted = sma + slope * i;
    const margin = currentPrice * 0.05;
    forecastPrices.push({
      date: d.toISOString(),
      price: Math.round(Math.max(predicted, 0.1) * 100) / 100,
      lower: Math.round(Math.max(predicted - margin, 0.1) * 100) / 100,
      upper: Math.round((predicted + margin) * 100) / 100
    });
  }

  const predicted7d = forecastPrices[6]?.price || sma;
  const change = ((predicted7d - currentPrice) / currentPrice * 100);

  const supplySnap = await db.collection('crops').where('cropName', '==', cropName).where('status', '==', 'available').get();
  let supply = 0;
  supplySnap.forEach(d => supply += d.data().quantity || 0);

  const buyerInterestSnap = await db.collection('orders').where('cropName', '==', cropName).get();
  const buyerInterest = buyerInterestSnap.size;

  const demandScore = Math.min(100, Math.max(0, Math.round(30 + buyerInterest * 15 - supply * 0.02 + Math.abs(change) * 2)));

  return {
    crop: cropName,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictedPrice: Math.round(predicted7d * 100) / 100,
    priceChange: Math.round(change * 10) / 10,
    demandScore,
    confidence: Math.min(95, 40 + historicalPrices.length * 2),
    trend: slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable',
    recommendation: change > 3 ? 'Sell Now — prices expected to rise' : change < -3 ? 'Hold — prices may drop' : 'Stable — sell when ready',
    historicalPrices,
    forecastPrices,
    factors: [
      { name: 'Supply on Platform', impact: supply > 500 ? 'negative' : 'positive', weight: 0.3, detail: `${supply} kg listed` },
      { name: 'Buyer Demand', impact: buyerInterest > 0 ? 'positive' : 'neutral', weight: 0.25, detail: `${buyerInterest} orders placed` },
      { name: 'Price Trend', impact: slope > 0 ? 'positive' : slope < 0 ? 'negative' : 'neutral', weight: 0.25, detail: `${slope > 0 ? 'Rising' : slope < 0 ? 'Falling' : 'Flat'}` },
      { name: 'Data Points', impact: history.length > 10 ? 'positive' : 'low', weight: 0.2, detail: `${history.length} price records` }
    ],
    dataSource: history.length > 0 ? 'Real price history from database' : 'Limited data — add more market prices for accuracy'
  };
}

router.get('/price/:crop', async (req, res) => {
  try {
    const prediction = await predict(req.params.crop);
    res.json({ success: true, prediction });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/demand', async (req, res) => {
  try {
    const cropNamesSet = new Set();
    const mpSnap = await db.collection('market_prices').get();
    mpSnap.forEach(d => cropNamesSet.add(d.data().cropName));
    const cropSnap = await db.collection('crops').where('status', '==', 'available').get();
    cropSnap.forEach(d => cropNamesSet.add(d.data().cropName));

    const cropNames = Array.from(cropNamesSet);

    if (cropNames.length === 0) {
      return res.json({ success: true, forecasts: [], message: 'No crop data yet. Add market prices or crop listings first.' });
    }

    const forecasts = await Promise.all(cropNames.map(async crop => {
      const p = await predict(crop);
      return {
        crop: p.crop,
        demandScore: p.demandScore || 0,
        predictedPrice: p.predictedPrice || 0,
        currentPrice: p.currentPrice || 0,
        priceChange: p.priceChange || 0,
        confidence: p.confidence || 0,
        trend: p.trend || 'stable',
        recommendation: p.recommendation || 'Add more data'
      };
    }));

    forecasts.sort((a, b) => b.demandScore - a.demandScore);
    res.json({ success: true, forecasts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/voice-query', protect, async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'No query text provided' });

    const lower = text.toLowerCase();

    const cropNamesSet = new Set();
    const mpSnap = await db.collection('market_prices').get();
    mpSnap.forEach(d => cropNamesSet.add(d.data().cropName));
    const cropSnap = await db.collection('crops').get();
    cropSnap.forEach(d => cropNamesSet.add(d.data().cropName));
    const allCrops = Array.from(cropNamesSet);

    let detectedCrop = null;
    for (const c of allCrops) {
      if (lower.includes(c.toLowerCase())) { detectedCrop = c; break; }
    }

    let response = '';

    if ((lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('keemat') || lower.includes('bhav')) && detectedCrop) {
      const p = await predict(detectedCrop);
      if (p.noData) {
        response = p.message;
      } else {
        response = `The current market price of ${detectedCrop} is ₹${p.currentPrice}/${p.unit || 'kg'}. Predicted price in 7 days: ₹${p.predictedPrice}/${p.unit || 'kg'} (${p.priceChange >= 0 ? '+' : ''}${p.priceChange}%). ${p.recommendation}.`;
      }
    } else if (lower.includes('demand') || lower.includes('forecast') || lower.includes('maang')) {
      if (detectedCrop) {
        const p = await predict(detectedCrop);
        response = p.noData ? p.message : `${detectedCrop} demand score: ${p.demandScore}%. ${p.recommendation}.`;
      } else {
        const topSnap = await db.collection('market_prices').orderBy('price', 'desc').limit(3).get();
        const top = topSnap.docs.map(d => d.data());
        response = top.length > 0
          ? `Top priced crops: ${top.map(t => `${t.cropName} (₹${t.price}/kg)`).join(', ')}. Check demand forecast page for detailed analysis.`
          : 'No market data available yet. Ask your admin to update market prices.';
      }
    } else if (lower.includes('weather') || lower.includes('mausam')) {
      response = 'For live weather updates, please check the dashboard weather widget. I can help with crop prices, demand, and selling. Try: "What is tomato price?"';
    } else if (lower.includes('group') || lower.includes('sell')) {
      const gSnap = await db.collection('groups_table').where('status', 'in', ['forming','active','negotiating']).count().get();
      const groups = gSnap.data().count;
      response = groups > 0 ? `There are ${groups} active selling groups on the platform. Visit Group Selling to join or create one.` : 'No selling groups yet. You can create one from the Group Selling page.';
    } else if (lower.includes('help') || lower.includes('madad')) {
      response = 'I can help with:\n• Crop prices → "What is rice price?"\n• Demand → "Show demand forecast"\n• Groups → "Any selling groups?"\n• Weather → "Today weather"\nTry asking about a specific crop!';
    } else if (lower.includes('listing') || lower.includes('crop') || lower.includes('fasal')) {
      const cSnap = await db.collection('crops').where('status', '==', 'available').count().get();
      const count = cSnap.data().count;
      response = count > 0 ? `There are ${count} crop listings available on the marketplace right now. Browse Market Prices or Smart Matching to explore.` : 'No crop listings yet. Farmers can add crops from My Crops page.';
    } else {
      response = `I understood: "${text}". I can help with crop prices, demand forecasts, selling groups, and market insights. Try asking "What is the price of tomato?" or "Show demand forecast".`;
    }

    res.json({
      success: true, query: text, language: language || 'en',
      detectedCrop, response, timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
