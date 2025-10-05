const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  // Story reference
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  
  // Author information
  authorName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Blog content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  subtitle: {
    type: String,
    trim: true,
    maxlength: 300
  },
  
  content: {
    type: String,
    required: true
  },
  
  // Blog metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  category: {
    type: String,
    enum: ['personal-story', 'life-lessons', 'wisdom', 'inspiration', 'reflection', 'journey', 'experience', 'other'],
    default: 'personal-story'
  },
  
  // SEO and display
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  excerpt: {
    type: String,
    maxlength: 500
  },
  
  readingTime: {
    type: Number, // in minutes
    default: 5
  },
  
  // Publishing status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  
  publishedAt: {
    type: Date,
    default: Date.now
  },
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  
  likes: {
    type: Number,
    default: 0
  },
  
  // Generation metadata
  generationMethod: {
    type: String,
    enum: ['auto', 'manual', 'enhanced'],
    default: 'auto'
  },
  
  aiModel: {
    type: String,
    default: 'gemini-2.5-flash'
  },
  
  generationQuality: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    default: 'standard'
  },
  
  // Featured content
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  featuredImage: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Indexes for efficient querying
blogSchema.index({ slug: 1 });
blogSchema.index({ authorName: 1, createdAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ isFeatured: 1, publishedAt: -1 });

// Generate slug from title before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Add timestamp to ensure uniqueness
    this.slug += `-${Date.now()}`;
  }
  next();
});

// Calculate reading time based on content
blogSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
    
    // Generate excerpt if not provided
    if (!this.excerpt) {
      this.excerpt = this.content
        .replace(/\n+/g, ' ')
        .substring(0, 300)
        .trim() + '...';
    }
  }
  next();
});

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function() {
  return this.publishedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Method to increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle like
blogSchema.methods.toggleLike = function() {
  this.likes += 1;
  return this.save();
};

module.exports = mongoose.model('Blog', blogSchema);