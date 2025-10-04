const express = require('express');
const router = express.Router();
const Story = require('../models/Story');

// Get all stories
router.get('/', async (req, res) => {
  try {
    const stories = await Story.find()
      .sort({ createdAt: -1 })
      .select('-conversationHistory'); // Exclude full conversation for list view
    
    res.json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});

// Get a single story by ID
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }
    
    res.json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch story'
    });
  }
});

// Delete a story
router.delete('/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete story'
    });
  }
});

// Update story status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }
    
    res.json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Error updating story status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update story status'
    });
  }
});

// Get stories by topic
router.get('/topic/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const stories = await Story.find({ topic })
      .sort({ createdAt: -1 })
      .select('-conversationHistory');
    
    res.json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error('Error fetching stories by topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});

// Get stories by storyteller name
router.get('/storyteller/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const stories = await Story.find({ 
      storytellerName: new RegExp(name, 'i') 
    })
      .sort({ createdAt: -1 })
      .select('-conversationHistory');
    
    res.json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error('Error fetching stories by storyteller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalStories = await Story.countDocuments();
    const completedStories = await Story.countDocuments({ status: 'completed' });
    const processingStories = await Story.countDocuments({ status: 'processing' });
    
    const topicCounts = await Story.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const totalDuration = await Story.aggregate([
      { $group: { _id: null, total: { $sum: '$recordingDuration' } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalStories,
        completedStories,
        processingStories,
        topicDistribution: topicCounts,
        totalRecordingDuration: totalDuration[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;