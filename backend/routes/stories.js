const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Story = require('../models/Story');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/audio/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// GET all stories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, storyteller, topic, status } = req.query;
    
    const filter = {};
    if (storyteller) filter.storytellerName = new RegExp(storyteller, 'i');
    if (topic) filter.topic = topic;
    if (status) filter.status = status;

    const stories = await Story.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Story.countDocuments(filter);

    res.json({
      stories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// GET story by ID
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).select('-__v');
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// POST new story (with optional audio file)
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    const {
      storytellerName,
      topic,
      recordingDuration,
      transcript,
      conversationHistory
    } = req.body;

    // Validate required fields
    if (!storytellerName || !topic || !recordingDuration) {
      return res.status(400).json({
        error: 'Missing required fields: storytellerName, topic, recordingDuration'
      });
    }

    const storyData = {
      storytellerName,
      topic,
      recordingDuration: parseInt(recordingDuration),
      transcript: transcript || '',
      conversationHistory: conversationHistory ? JSON.parse(conversationHistory) : []
    };

    // Add audio file info if uploaded
    if (req.file) {
      storyData.audioFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };
      storyData.audioUrl = `/api/audio/${req.file.filename}`;
    }

    const story = new Story(storyData);
    const savedStory = await story.save();

    // Simulate AI processing (in production, this would be a separate service)
    setTimeout(async () => {
      try {
        await Story.findByIdAndUpdate(savedStory._id, {
          status: 'completed',
          aiProcessed: true,
          'blogPost': {
            title: `${storytellerName}'s ${topic} Story`,
            content: generateSampleBlogPost(storyData),
            generatedAt: new Date()
          },
          'metadata.keyTopics': extractKeyTopics(storyData)
        });
        console.log(`AI processing completed for story: ${savedStory._id}`);
      } catch (error) {
        console.error('Error in AI processing:', error);
        await Story.findByIdAndUpdate(savedStory._id, { status: 'failed' });
      }
    }, 5000); // Simulate 5 second processing time

    res.status(201).json({
      message: 'Story saved successfully and AI processing started',
      story: savedStory
    });

  } catch (error) {
    console.error('Error saving story:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to save story' });
  }
});

// PUT update story
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      message: 'Story updated successfully',
      story
    });
  } catch (error) {
    console.error('Error updating story:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// DELETE story
router.delete('/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// GET stories by storyteller
router.get('/search/storyteller/:name', async (req, res) => {
  try {
    const stories = await Story.findByStoryteller(req.params.name);
    res.json(stories);
  } catch (error) {
    console.error('Error searching stories:', error);
    res.status(500).json({ error: 'Failed to search stories' });
  }
});

// GET processing statistics
router.get('/stats/processing', async (req, res) => {
  try {
    const stats = await Story.getProcessingStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Serve audio files
router.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/audio/', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving audio file:', err);
      res.status(404).json({ error: 'Audio file not found' });
    }
  });
});

// Helper function to generate sample blog post (replace with actual AI in production)
function generateSampleBlogPost(storyData) {
  const topicTitles = {
    childhood: 'Childhood Memories',
    family: 'Family Stories',
    career: 'Work & Career Journey',
    love: 'Love & Relationships',
    wisdom: 'Life Lessons',
    travel: 'Adventures & Travel'
  };

  return `
# ${storyData.storytellerName}'s ${topicTitles[storyData.topic]}

*Recorded on ${new Date().toLocaleDateString()} • Duration: ${Math.floor(storyData.recordingDuration / 60)}:${(storyData.recordingDuration % 60).toString().padStart(2, '0')}*

## A Personal Story

${storyData.transcript || 'This story has been processed and will be available here once the AI analysis is complete.'}

### Reflection

This heartfelt story shares valuable insights and experiences that will be cherished for generations to come.

*Preserved with Memory Keeper*
  `.trim();
}

// Helper function to extract key topics (simplified)
function extractKeyTopics(storyData) {
  const topicKeywords = {
    childhood: ['child', 'school', 'play', 'grow up', 'parents'],
    family: ['family', 'mother', 'father', 'sibling', 'home'],
    career: ['work', 'job', 'career', 'boss', 'colleague'],
    love: ['love', 'marriage', 'partner', 'relationship', 'date'],
    wisdom: ['learn', 'lesson', 'advice', 'experience', 'know'],
    travel: ['travel', 'trip', 'vacation', 'adventure', 'journey']
  };

  const keywords = topicKeywords[storyData.topic] || [];
  return keywords.slice(0, 3);
}

module.exports = router;