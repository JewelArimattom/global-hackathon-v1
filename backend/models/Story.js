const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema({
  speaker: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isFallback: {
    type: Boolean,
    default: false
  }
});

const storySchema = new mongoose.Schema({
  storytellerName: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true,
    enum: ['childhood', 'family', 'career', 'love', 'wisdom', 'travel']
  },
  interviewMode: {
    type: String,
    enum: ['voice', 'phone'],
    default: 'voice'
  },
  phoneNumber: {
    type: String
  },
  recordingDuration: {
    type: Number,
    default: 0,
    min: [0, 'Recording duration cannot be negative']
  },
  transcript: {
    type: String,
    default: ''
  },
  audioUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  conversationHistory: [conversationMessageSchema],
  extractedEntities: {
    names: [String],
    locations: [String],
    dates: [String],
    organizations: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
storySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Story', storySchema);