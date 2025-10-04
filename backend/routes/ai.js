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
      audioRecordings: [], // Initialize empty audio recordings array
      status: 'processing',
      interviewMode: interviewMode || 'voice'
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

// New endpoint for voice message processing
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

    // Step 4: Clean up audio file (optional - you might want to keep it)
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

router.post('/end-session', async (req, res) => {
  const { storyId, recordingDuration } = req.body;
  try {
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    const finalSummary = await generateFinalSummary(story.conversationHistory, story.storytellerName);
    story.summary = finalSummary;
    story.transcript = story.conversationHistory.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
    story.status = 'completed';
    story.recordingDuration = recordingDuration || 0;
    await story.save();
    console.log(`✅ Story summary generated and saved for story ID: ${storyId}`);
    res.json({
      message: 'Story session completed and saved!',
      storyId: story._id,
      summary: finalSummary,
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
              audioFile: audioFilename // Store reference to audio file
            },
            { speaker: 'ai', text: aiResponse, timestamp: new Date() }
          ]
        },
        audioRecordings: audioFilename // Also store in separate audio recordings array
      }
    });
    console.log(`✅ Updated story ${storyId} with voice message and audio reference`);
  } catch (dbError) {
    console.error(`❌ Database update error for story ${storyId}:`, dbError);
  }
}

async function convertSpeechToText(audioFilePath) {
  // For production, you would use a speech-to-text service like:
  // - Google Speech-to-Text
  // - AWS Transcribe
  // - Azure Speech Services
  // - Mozilla DeepSpeech
  
  // Since we're using Google Gemini, let's use Google Speech-to-Text
  // For now, I'll provide a mock implementation
  // You'll need to implement the actual API call
  
  return await mockSpeechToText(audioFilePath);
}

async function mockSpeechToText(audioFilePath) {
  // This is a mock implementation
  // In production, replace this with actual Google Speech-to-Text API
  
  const mockResponses = [
    "I was thinking about my childhood and all the memories I have.",
    "The other day I went for a walk in the park and saw something amazing.",
    "I remember when I first learned to ride a bicycle.",
    "My grandmother used to tell me stories about her life.",
    "I've been thinking a lot about the future lately.",
    "There's this place I used to visit when I was younger.",
    "I had the most interesting dream last night.",
    "I want to share something that's been on my mind.",
    "Life has been quite a journey for me so far.",
    "I remember the first time I saw the ocean."
  ];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return random mock response
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

// For production - Google Speech-to-Text implementation
async function googleSpeechToText(audioFilePath) {
  // You'll need to install: npm install @google-cloud/speech
  /*
  const speech = require('@google-cloud/speech');
  const client = new speech.SpeechClient();
  
  const audio = {
    content: fs.readFileSync(audioFilePath).toString('base64'),
  };
  
  const config = {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
  };
  
  const request = {
    audio: audio,
    config: config,
  };
  
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
    
  return transcription;
  */
  
  // Placeholder for actual implementation
  return "Google Speech-to-Text would transcribe: " + audioFilePath;
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
    You are a helpful assistant. Please read the following conversation with ${storytellerName} and create a concise, bullet-pointed summary of the main topics and memories they shared.
    
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