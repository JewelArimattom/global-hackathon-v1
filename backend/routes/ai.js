const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/audio';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + '.webm');
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Attempt to load the Story model for database interactions
let Story;
try {
  Story = require('../models/Story');
  console.log('✅ Story model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Story model. Database operations will be disabled.');
}

// --- API Key and AI Initialization ---
const isApiKeyAvailable = !!process.env.GEMINI_API_KEY;
if (!isApiKeyAvailable) {
  console.error("🔴 CRITICAL: GEMINI_API_KEY is not set in your .env file.");
  console.warn("   The AI service will run in a limited TEST MODE.");
}
const genAI = isApiKeyAvailable ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// --- Core AI Persona ---
const FRIENDLY_LISTENER_PROMPT = `
You are an AI friend. Your goal is to be a warm, empathetic, and attentive listener.
- Your tone is natural, casual, and encouraging.
- Your responses must be very short. Use phrases like "I'm listening.", "Go on.", "That's interesting.", "Mm-hmm.", or "Tell me more."
- NEVER ask structured questions. Your role is to listen and gently prompt the user to continue their train of thought.
- Make the user feel heard and comfortable sharing whatever is on their mind.
`;

// --- API Endpoints ---

router.get('/health', (req, res) => {
  if (isApiKeyAvailable && genAI) {
    res.status(200).json({ status: 'OK', message: 'AI Listener is ready.' });
  } else {
    res.status(503).json({ status: 'UNAVAILABLE', message: 'AI service is not configured. GEMINI_API_KEY is missing.' });
  }
});

router.post('/start-session', async (req, res) => {
  const { storytellerName, topic, interviewMode } = req.body;
  if (!Story) return res.status(500).json({ error: 'Database model not configured.' });
  try {
    const greeting = `Hello ${storytellerName}! Thanks for chatting. I'm here to listen to any story you'd like to share. Just begin when you're ready.`;
    
    const newStory = new Story({
      storytellerName,
      topic: topic || 'wisdom', 
      conversationHistory: [{ speaker: 'ai', text: greeting, timestamp: new Date() }],
      audioRecordings: [],
      status: 'processing',
      interviewMode: interviewMode || 'voice',
      blogPost: '',
      blogTitle: '',
      blogTags: []
    });
    await newStory.save();
    console.log(`✅ New listener session started for ${storytellerName}. ID: ${newStory._id}`);
    res.json({ storyId: newStory._id, greeting, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error creating story session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

router.post('/chat', async (req, res) => {
  const { message, storyId, storytellerName } = req.body;
  
  console.log('📨 Chat request received:', {
    storyId: storyId,
    message: message,
    storytellerName: storytellerName
  });

  if (!isApiKeyAvailable) {
    return res.json({ 
      response: `I hear you, ${storytellerName}. (Test Mode)`, 
      timestamp: new Date().toISOString() 
    });
  }

  try {
    // Get the current story to build conversation history
    let conversationHistory = [];
    if (storyId && Story) {
      const story = await Story.findById(storyId);
      if (story) {
        conversationHistory = story.conversationHistory || [];
        console.log(`📖 Loaded conversation history with ${conversationHistory.length} messages`);
      }
    }

    const friendlyResponse = await generateAcknowledgement(message, conversationHistory, storytellerName);
    
    if (storyId && Story) {
      await updateStory(storyId, message, friendlyResponse);
    }
    
    res.json({ 
      response: friendlyResponse, 
      timestamp: new Date().toISOString(),
      storyId: storyId
    });
  } catch (error) {
    console.error('🔴 A critical error occurred in the /chat endpoint:', error);
    const fallbackResponse = `I'm having a little trouble hearing you. Could you say that again?`;
    res.status(500).json({
      error: 'The AI service failed to generate a response.',
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      isFallback: true
    });
  }
});

// Voice message processing endpoint
router.post('/voice-message', upload.single('audio'), async (req, res) => {
  const { storyId, storytellerName } = req.body;
  
  console.log('🎤 Voice message received:', {
    storyId: storyId,
    storytellerName: storytellerName,
    file: req.file ? req.file.filename : 'No file'
  });

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    // Step 1: Convert speech to text
    const transcribedText = await convertSpeechToText(req.file.path);
    console.log('📝 Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim().length === 0) {
      throw new Error('No speech detected in audio');
    }

    // Step 2: Get AI response
    let conversationHistory = [];
    if (storyId && Story) {
      const story = await Story.findById(storyId);
      if (story) {
        conversationHistory = story.conversationHistory || [];
      }
    }

    const friendlyResponse = await generateAcknowledgement(transcribedText, conversationHistory, storytellerName);

    // Step 3: Update database with both text and audio reference
    if (storyId && Story) {
      await updateStoryWithAudio(storyId, transcribedText, friendlyResponse, req.file.filename);
    }

    // Step 4: Clean up audio file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('❌ Failed to delete audio file:', err);
    });

    res.json({
      response: friendlyResponse,
      transcribedText: transcribedText,
      timestamp: new Date().toISOString(),
      storyId: storyId
    });

  } catch (error) {
    console.error('🔴 Error processing voice message:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('❌ Failed to delete audio file on error:', err);
      });
    }

    res.status(500).json({
      error: 'Failed to process voice message',
      response: "I couldn't quite catch that. Could you please try again?",
      timestamp: new Date().toISOString(),
      isFallback: true
    });
  }
});

// New endpoint to generate blog post from conversation
router.post('/generate-blog', async (req, res) => {
  const { storyId } = req.body;
  
  if (!storyId || !Story) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    console.log('📝 Generating blog post for story:', storyId);
    
    // Generate blog post from conversation
    const { blogTitle, blogContent, blogTags } = await generateBlogPost(story.conversationHistory, story.storytellerName);
    
    // Update story with generated blog
    story.blogTitle = blogTitle;
    story.blogPost = blogContent;
    story.blogTags = blogTags;
    story.status = 'completed';
    await story.save();

    console.log('✅ Blog post generated successfully for story:', storyId);

    res.json({
      success: true,
      blogTitle,
      blogContent,
      blogTags,
      message: 'Blog post generated successfully'
    });

  } catch (error) {
    console.error('🔴 Error generating blog post:', error);
    res.status(500).json({
      error: 'Failed to generate blog post',
      message: 'Could not generate blog post from conversation'
    });
  }
});

router.post('/end-session', async (req, res) => {
  const { storyId, recordingDuration } = req.body;
  try {
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    // Generate final summary
    const finalSummary = await generateFinalSummary(story.conversationHistory, story.storytellerName);
    story.summary = finalSummary;
    story.transcript = story.conversationHistory.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
    story.status = 'completed';
    story.recordingDuration = recordingDuration || 0;
    
    // Generate blog post automatically when session ends
    try {
      const { blogTitle, blogContent, blogTags } = await generateBlogPost(story.conversationHistory, story.storytellerName);
      story.blogTitle = blogTitle;
      story.blogPost = blogContent;
      story.blogTags = blogTags;
      console.log('✅ Blog post generated automatically for story:', storyId);
    } catch (blogError) {
      console.error('❌ Failed to generate blog post:', blogError);
      // Continue without blog post - don't fail the entire request
    }
    
    await story.save();
    
    console.log(`✅ Story session completed and saved for story ID: ${storyId}`);
    res.json({
      message: 'Story session completed and saved!',
      storyId: story._id,
      summary: finalSummary,
      blogTitle: story.blogTitle,
      blogGenerated: !!story.blogPost
    });
  } catch (error) {
    console.error('❌ Error ending story session:', error);
    res.status(500).json({ error: 'Failed to end story session' });
  }
});

// --- Helper Functions ---

async function updateStory(storyId, userMessage, aiResponse) {
  try {
    await Story.findByIdAndUpdate(storyId, { 
      $push: { 
        conversationHistory: { 
          $each: [
            { speaker: 'user', text: userMessage, timestamp: new Date() },
            { speaker: 'ai', text: aiResponse, timestamp: new Date() }
          ]
        }
      }
    });
    console.log(`✅ Updated story ${storyId} with new messages`);
  } catch (dbError) {
    console.error(`❌ Database update error for story ${storyId}:`, dbError);
  }
}

async function updateStoryWithAudio(storyId, userMessage, aiResponse, audioFilename) {
  try {
    await Story.findByIdAndUpdate(storyId, { 
      $push: { 
        conversationHistory: { 
          $each: [
            { 
              speaker: 'user', 
              text: userMessage, 
              timestamp: new Date(),
              audioFile: audioFilename
            },
            { speaker: 'ai', text: aiResponse, timestamp: new Date() }
          ]
        },
        audioRecordings: audioFilename
      }
    });
    console.log(`✅ Updated story ${storyId} with voice message and audio reference`);
  } catch (dbError) {
    console.error(`❌ Database update error for story ${storyId}:`, dbError);
  }
}

async function convertSpeechToText(audioFilePath) {
  // Mock implementation - replace with actual Google Speech-to-Text
  return await mockSpeechToText(audioFilePath);
}

async function mockSpeechToText(audioFilePath) {
  const mockResponses = [
    "I was thinking about my childhood and all the memories I have growing up in a small town.",
    "The other day I went for a walk in the park and saw the most beautiful sunset I've ever seen.",
    "I remember when I first learned to ride a bicycle - it was such a freeing experience.",
    "My grandmother used to tell me stories about her life during the war, and they've always stayed with me.",
    "I've been thinking a lot about the future lately and what I want to accomplish in my career.",
    "There's this little coffee shop I used to visit when I was in college that had the best atmosphere.",
    "I had the most interesting dream last night about traveling to a foreign country and meeting new people.",
    "I want to share something that's been on my mind about the importance of community and connection.",
    "Life has been quite a journey for me so far, with many ups and downs but valuable lessons learned.",
    "I remember the first time I saw the ocean - the vastness and power of it took my breath away."
  ];
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

async function generateBlogPost(conversationHistory, storytellerName) {
  if (!isApiKeyAvailable) {
    return {
      blogTitle: "Test Blog Post",
      blogContent: "This is a test blog post. In production, this would be generated from your conversation.",
      blogTags: ["test", "conversation", "story"]
    };
  }

  const userMessages = conversationHistory
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.text)
    .join('\n\n');

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const prompt = `
    You are a professional blog writer. Based on the following conversation with ${storytellerName}, create a compelling blog post.

    CONVERSATION TRANSCRIPT:
    ${userMessages}

    Please generate:
    1. A catchy, engaging title (max 60 characters)
    2. A well-structured blog post (500-800 words) that captures the essence of the story
    3. 3-5 relevant tags

    Format your response as JSON exactly like this:
    {
      "blogTitle": "The Title Here",
      "blogContent": "Full blog post content here...",
      "blogTags": ["tag1", "tag2", "tag3"]
    }

    Make the blog post:
    - Engaging and personal
    - Well-structured with paragraphs
    - Capture the emotional essence of the story
    - Suitable for a general audience
    - Include relevant insights or lessons learned
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const blogData = JSON.parse(jsonMatch[0]);
      return blogData;
    } else {
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('🔴 Error generating blog post:', error);
    
    // Fallback blog post
    return {
      blogTitle: `Conversation with ${storytellerName}`,
      blogContent: `This blog post is based on a conversation with ${storytellerName}. The conversation covered various personal stories and experiences that would make for an engaging read once processed.`,
      blogTags: ["conversation", "personal-story", "interview"]
    };
  }
}

async function generateAcknowledgement(userMessage, history, storytellerName) {
  if (!genAI) {
    return "I'm listening... (Test Mode)";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const conversationContext = (history || []).slice(-10).map(msg => 
    `${msg.speaker === 'user' ? storytellerName : 'Friend'}: ${msg.text}`
  ).join('\n');
  
  const prompt = `${FRIENDLY_LISTENER_PROMPT}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\n${storytellerName}: "${userMessage}"\n\nFriend:`;
  
  console.log('🤖 Generating AI response...');
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    console.log('✅ AI Response:', response);
    return response;
  } catch(error) {
    console.error(`--- 🔴 GEMINI ERROR ---`);
    console.error("Failed to generate response:", error);
    throw new Error("Gemini API call failed.");
  }
}

async function generateFinalSummary(conversationHistory, storytellerName) {
  if (!isApiKeyAvailable) return "Summary generation is disabled in test mode.";
  
  const transcript = conversationHistory
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.text)
    .join('\n\n');
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  
  const prompt = `
    Create a concise, bullet-pointed summary of the main topics and memories shared by ${storytellerName}.
    
    **Transcript:**
    ---
    ${transcript}
    ---
    **Summary:**
  `;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch(error) {
    console.error(`--- 🔴 GEMINI ERROR ---`);
    console.error("Failed to generate the final summary:", error);
    return `A summary could not be generated for this conversation with ${storytellerName}.`;
  }
}

module.exports = router;