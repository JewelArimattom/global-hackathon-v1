const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/story-weaver', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
const aiRoutes = require('./routes/ai');
const blogRoutes = require('./routes/blogs');

app.use('/api/ai', aiRoutes);
app.use('/api/blogs', blogRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Story Weaver API is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n✅ Server is running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}`);
  console.log(`📝 AI Routes: http://localhost:${PORT}/api/ai`);
  console.log(`📚 Blog Routes: http://localhost:${PORT}/api/blogs`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   - POST /api/ai/start-session`);
  console.log(`   - POST /api/ai/chat`);
  console.log(`   - POST /api/ai/voice-message`);
  console.log(`   - POST /api/ai/generate-blog`);
  console.log(`   - POST /api/ai/end-session`);
  console.log(`   - GET  /api/blogs`);
  console.log(`   - GET  /api/blogs/featured`);
  console.log(`   - GET  /api/blogs/slug/:slug`);
  console.log(`   - GET  /api/blogs/category/:category`);
  console.log(`   - GET  /api/blogs/tag/:tag`);
  console.log(`   - GET  /api/blogs/stats/overview`);
  console.log(`   - POST /api/blogs/:id/like\n`);
});