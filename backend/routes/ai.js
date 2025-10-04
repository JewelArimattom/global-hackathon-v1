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
You are an AI friend. Your goal is be a warm, empathetic, and attentive listener.
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
      blogTags: [],
      autoBlogEnabled: true // Enable auto blog generation
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
      
      // Auto-generate blog after every 3 user messages
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 3 && story.autoBlogEnabled && !story.blogPost) {
        console.log('🔄 Auto-generating blog post after 3 user messages...');
        await generateAndSaveBlogPost(storyId);
      }
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

// Voice message processing with Gemini speech-to-text
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
    // Step 1: Convert speech to text using Gemini
    const transcribedText = await convertSpeechToTextWithGemini(req.file.path);
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
      
      // Auto-generate blog after voice messages
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 2 && story.autoBlogEnabled && !story.blogPost) {
        console.log('🔄 Auto-generating blog post after voice message...');
        await generateAndSaveBlogPost(storyId);
      }
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

// Generate blog post from conversation
router.post('/generate-blog', async (req, res) => {
  const { storyId } = req.body;
  
  if (!storyId || !Story) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const blogData = await generateAndSaveBlogPost(storyId);
    
    res.json({
      success: true,
      ...blogData,
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
    
    // Auto-generate blog post if not already generated
    if (!story.blogPost && story.autoBlogEnabled) {
      try {
        const blogData = await generateAndSaveBlogPost(storyId);
        console.log('✅ Blog post generated automatically for story:', storyId);
      } catch (blogError) {
        console.error('❌ Failed to generate blog post:', blogError);
      }
    }
    
    await story.save();
    
    console.log(`✅ Story session completed and saved for story ID: ${storyId}`);
    res.json({
      message: 'Story session completed and saved!',
      storyId: story._id,
      summary: finalSummary,
      blogTitle: story.blogTitle,
      blogGenerated: !!story.blogPost,
      blogData: story.blogPost ? {
        blogTitle: story.blogTitle,
        blogContent: story.blogPost,
        blogTags: story.blogTags
      } : null
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

async function convertSpeechToTextWithGemini(audioFilePath) {
  if (!isApiKeyAvailable) {
    // Fallback to mock transcription
    return await mockSpeechToText(audioFilePath);
  }

  try {
    // Read audio file and convert to base64
    const audioFile = fs.readFileSync(audioFilePath);
    const base64Audio = audioFile.toString('base64');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      }
    });

    const prompt = `
      Please transcribe the following audio file accurately. 
      Return only the transcribed text without any additional commentary or formatting.
      If the audio is unclear or contains background noise, do your best to transcribe what you hear.
    `;

    // Create the request with the audio file
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio
        }
      }
    ]);

    const transcription = result.response.text().trim();
    console.log('🎯 Gemini Transcription:', transcription);
    return transcription;

  } catch (error) {
    console.error('🔴 Gemini speech-to-text error:', error);
    // Fallback to mock transcription
    return await mockSpeechToText(audioFilePath);
  }
}

async function mockSpeechToText(audioFilePath) {
  const mockResponses = [
    "I was thinking about my childhood memories and how they shaped who I am today.",
    "The other day I had this incredible experience that really changed my perspective on life.",
    "I remember when I first discovered my passion for storytelling and how it transformed my career.",
    "My family has always been my rock, and I want to share some stories about our journey together.",
    "I've been reflecting on the importance of community and how it impacts our daily lives.",
    "There's this beautiful place I visited recently that reminded me of the simple joys in life.",
    "I learned some valuable lessons from my mentors that I think could help others too.",
    "The journey of personal growth has been challenging but incredibly rewarding for me.",
    "I want to talk about the power of resilience and how it helped me overcome obstacles.",
    "Finding balance in life has been my biggest challenge and greatest achievement."
  ];
  
  await new Promise(resolve => setTimeout(resolve, 800));
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

async function generateAndSaveBlogPost(storyId) {
  if (!isApiKeyAvailable) {
    const blogData = {
      blogTitle: "A Personal Story Journey",
      blogContent: "This is a sample blog post that would be generated from your conversation in production mode.",
      blogTags: ["personal", "story", "journey"]
    };
    
    if (Story) {
      await Story.findByIdAndUpdate(storyId, blogData);
    }
    
    return blogData;
  }

  try {
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    const userMessages = story.conversationHistory
      .filter(msg => msg.speaker === 'user')
      .map(msg => msg.text)
      .join('\n\n');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    const prompt = `
      Create a compelling, well-structured blog post based on the following personal conversation. 
      The blog should capture the essence of the story while making it engaging for readers.

      CONVERSATION CONTENT:
      ${userMessages}

      REQUIREMENTS:
      - Create a catchy, emotional title (max 60 characters)
      - Write 500-800 words of engaging content
      - Structure with clear paragraphs and natural flow
      - Capture the emotional journey and key insights
      - Make it personal and relatable
      - Include 3-5 relevant tags

      FORMAT: Return ONLY valid JSON without any markdown or additional text:
      {
        "blogTitle": "The Title Here",
        "blogContent": "Full blog post content here...",
        "blogTags": ["tag1", "tag2", "tag3"]
      }

      Make the blog post inspiring, well-written, and suitable for a general audience.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const blogData = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the data
      if (!blogData.blogTitle || !blogData.blogContent) {
        throw new Error('Invalid blog data generated');
      }

      // Save to database
      if (Story) {
        await Story.findByIdAndUpdate(storyId, {
          blogTitle: blogData.blogTitle,
          blogPost: blogData.blogContent,
          blogTags: blogData.blogTags || []
        });
      }

      console.log('✅ Blog post generated and saved:', blogData.blogTitle);
      return blogData;
    } else {
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('🔴 Error generating blog post:', error);
    
    // Fallback blog post
    const fallbackBlog = {
      blogTitle: "A Personal Journey of Discovery",
      blogContent: `This blog post captures the personal stories and insights shared in a recent conversation. The speaker reflected on various life experiences, lessons learned, and moments that shaped their perspective. While the full depth of the conversation is preserved in our records, this blog serves as a testament to the power of personal storytelling and the wisdom that emerges when we take time to reflect on our journeys.`,
      blogTags: ["personal-growth", "storytelling", "reflection"]
    };

    if (Story) {
      await Story.findByIdAndUpdate(storyId, fallbackBlog);
    }

    return fallbackBlog;
  }
}

async function generateAcknowledgement(userMessage, history, storytellerName) {
  if (!genAI) {
    return "I'm listening... (Test Mode)";
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 50,
    }
  });

  const conversationContext = (history || []).slice(-6).map(msg => 
    `${msg.speaker === 'user' ? storytellerName : 'Friend'}: ${msg.text}`
  ).join('\n');
  
  const prompt = `${FRIENDLY_LISTENER_PROMPT}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\n${storytellerName}: "${userMessage}"\n\nFriend:`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    console.log('✅ AI Response:', response);
    return response;
  } catch(error) {
    console.error(`--- 🔴 GEMINI ERROR ---`);
    console.error("Failed to generate response:", error);
    return "I'm listening. Please continue...";
  }
}

async function generateFinalSummary(conversationHistory, storytellerName) {
  if (!isApiKeyAvailable) return "Summary generation is disabled in test mode.";
  
  const transcript = conversationHistory
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.text)
    .join('\n\n');
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `
    Create a concise, warm summary of the main stories and insights shared by ${storytellerName}.
    Focus on the emotional journey and key moments.
    
    Conversation:
    ${transcript}
    
    Summary:
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