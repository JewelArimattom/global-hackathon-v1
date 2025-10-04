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
      type: String,
      default: null
    }
  }],
  audioRecordings: [{
    type: String,
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
  // Blog fields
  blogTitle: {
    type: String,
    default: ''
  },
  blogPost: {
    type: String,
    default: ''
  },
  blogTags: [{
    type: String,
    default: []
  }],
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
    type: Number,
    default: 0
  },
  autoBlogEnabled: {
    type: Boolean,
    default: true
  },
  blogGeneratedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add indexes
storySchema.index({ storytellerName: 1, createdAt: -1 });
storySchema.index({ status: 1 });
storySchema.index({ blogTags: 1 });
storySchema.index({ autoBlogEnabled: 1 });

// Virtual for blog excerpt
storySchema.virtual('blogExcerpt').get(function() {
  if (!this.blogPost) return '';
  return this.blogPost.substring(0, 150) + '...';
});

module.exports = mongoose.model('Story', storySchema);