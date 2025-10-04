const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
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
  }
});

const storySchema = new mongoose.Schema({
  storytellerName: {
    type: String,
    required: [true, 'Storyteller name is required'],
    trim: true
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    enum: ['childhood', 'family', 'career', 'love', 'wisdom', 'travel']
  },
  recordingDuration: {
    type: Number,
    required: [true, 'Recording duration is required'],
    min: [1, 'Recording duration must be at least 1 second']
  },
  transcript: {
    type: String,
    default: ''
  },
  audioUrl: {
    type: String,
    default: ''
  },
  audioFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  },
  conversationHistory: [conversationSchema],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  aiProcessed: {
    type: Boolean,
    default: false
  },
  blogPost: {
    title: String,
    content: String,
    generatedAt: Date
  },
  metadata: {
    recordingQuality: String,
    language: {
      type: String,
      default: 'en-US'
    },
    emotionScore: Number,
    keyTopics: [String]
  }
}, {
  timestamps: true
});

// Index for better query performance
storySchema.index({ storytellerName: 1, createdAt: -1 });
storySchema.index({ topic: 1, status: 1 });
storySchema.index({ createdAt: -1 });

// Virtual for formatted duration
storySchema.virtual('formattedDuration').get(function() {
  const mins = Math.floor(this.recordingDuration / 60);
  const secs = this.recordingDuration % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
});

// Method to mark as processed
storySchema.methods.markAsCompleted = function(blogPost = null) {
  this.status = 'completed';
  this.aiProcessed = true;
  if (blogPost) {
    this.blogPost = {
      title: blogPost.title,
      content: blogPost.content,
      generatedAt: new Date()
    };
  }
  return this.save();
};

// Static method to get stories by storyteller
storySchema.statics.findByStoryteller = function(name) {
  return this.find({ storytellerName: new RegExp(name, 'i') }).sort({ createdAt: -1 });
};

// Static method to get processing statistics
storySchema.statics.getProcessingStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$recordingDuration' }
      }
    }
  ]);
};

const Story = mongoose.model('Story', storySchema);

module.exports = Story;