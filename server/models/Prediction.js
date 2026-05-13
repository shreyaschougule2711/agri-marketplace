const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  crop: {
    type: String,
    required: true
  },
  predictedPrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  priceChange: Number,
  demandScore: {
    type: Number,
    min: 0,
    max: 100
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  market: String,
  state: String,
  forecastPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  factors: [{
    name: String,
    impact: String,
    weight: Number
  }],
  historicalPrices: [{
    date: Date,
    price: Number
  }],
  forecastPrices: [{
    date: Date,
    price: Number,
    lower: Number,
    upper: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prediction', predictionSchema);
