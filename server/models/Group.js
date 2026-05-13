const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true
  },
  cropType: {
    type: String,
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    quantity: Number,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalQuantity: {
    type: Number,
    default: 0
  },
  targetQuantity: Number,
  pricePerUnit: Number,
  unit: {
    type: String,
    default: 'kg'
  },
  status: {
    type: String,
    enum: ['forming', 'active', 'negotiating', 'sold', 'closed'],
    default: 'forming'
  },
  location: {
    state: String,
    district: String
  },
  description: String,
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Group', groupSchema);
