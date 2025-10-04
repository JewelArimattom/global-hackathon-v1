const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  storytellerName: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    default: 'wisdom'
  },
  conversationHistory: [{
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
    audioFile: {
      type: String, // Store filename of audio recording
      default: null
    }
  }],
  audioRecordings: [{
    type: String, // Array of audio filenames
    default: []
  }],
  summary: {
    type: String,
    default: ''
  },
  transcript: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'archived'],
    default: 'processing'
  },
  interviewMode: {
    type: String,
    enum: ['voice', 'text'],
    default: 'voice'
  },
  recordingDuration: {
    type: Number, // Total recording duration in seconds
    default: 0
  }
}, {
  timestamps: true
});

// Add index for better query performance
storySchema.index({ storytellerName: 1, createdAt: -1 });
storySchema.index({ status: 1 });

module.exports = mongoose.model('Story', storySchema);