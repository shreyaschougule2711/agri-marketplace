const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: [true, 'Crop name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['vegetable', 'fruit', 'grain', 'pulse', 'spice', 'oilseed', 'cash_crop', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'quintal', 'ton', 'dozen', 'piece'],
    default: 'kg'
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  quality: {
    type: String,
    enum: ['premium', 'standard', 'economy'],
    default: 'standard'
  },
  harvestDate: Date,
  expiryDate: Date,
  description: String,
  images: [String],
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    state: String,
    district: String,
    market: String
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'sold', 'expired'],
    default: 'available'
  },
  organic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

cropSchema.index({ cropName: 'text', category: 1, status: 1 });

module.exports = mongoose.model('Crop', cropSchema);
