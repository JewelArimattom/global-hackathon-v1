const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Import Story model - adjust path if needed
let Story;
try {
  Story = require('../models/Story');
  console.log('✅ Story model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Story model:', error.message);
  console.error('Make sure the Story.js file exists in the models/ directory');
}

// --- Check for API Key at startup ---
const isApiKeyAvailable = !!process.env.GEMINI_API_KEY;
if (!isApiKeyAvailable) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in your .env file. The AI service will run in TEST MODE.");
}

// Initialize Gemini AI (only if key is available)
const genAI = isApiKeyAvailable ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;


// --- Health Check Endpoint ---
router.get('/health', (req, res) => {
  if (isApiKeyAvailable && genAI) {
    res.status(200).json({ status: 'OK', message: 'AI service is ready.' });
  } else {
    res.status(503).json({ status: 'UNAVAILABLE', message: 'AI service is not configured. GEMINI_API_KEY is missing.' });
  }
});


// --- Professional Prompts and Fallbacks ---
const TOPIC_PROMPTS = {
  childhood: `You are a compassionate oral history interviewer specializing in childhood memories. Ask open-ended questions that encourage reflection and detail about growing up, family life, and formative moments.`,
  family: `You are a genealogical researcher documenting family histories. Your goal is to capture rich stories about family traditions, relationships, and heritage.`,
  career: `You are a professional biographer documenting career journeys. Focus on career milestones, challenges, achievements, and lessons learned.`,
  love: `You are a relationship historian capturing love stories and romantic journeys. Focus on meeting stories, relationship milestones, and what makes their love unique.`,
  wisdom: `You are a wisdom collector preserving life lessons and philosophical insights. Your role is to draw out hard-earned wisdom, values, and advice for future generations.`,
  travel: `You are an adventure chronicler documenting travel experiences and cultural encounters. Focus on transformative journeys, memorable places, and personal growth through travel.`
};

const PROFESSIONAL_QUESTIONS = {
  childhood: ["What is one of your most vivid childhood memories?"],
  family: ["Can you share a story about a family tradition that was important to you?"],
  career: ["Was there a turning point in your career that set you on your current path?"],
  love: ["Tell me about a moment you knew you were in love."],
  wisdom: ["What is one piece of advice you would give to your younger self?"],
  travel: ["Describe a trip that had a lasting impact on you."]
};


router.post('/chat', async (req, res) => {
  const { message, topic, storytellerName, conversationHistory, storyId } = req.body;

  console.log('💬 Chat request received');
  console.log('- Story ID:', storyId);
  console.log('- Topic:', topic);
  console.log('- Message length:', message?.length || 0);
  console.log('- Conversation history length:', conversationHistory?.length || 0);

  if (!isApiKeyAvailable) {
    console.log("--- AI Service is in TEST MODE ---");
    const testResponse = `This is a test response for the topic '${topic}'. The Gemini API is currently bypassed.`;
    return res.json({ response: testResponse, timestamp: new Date().toISOString() });
  }
  
  try {
    console.log('🔄 Generating Gemini response...');
    const fullResponse = await generateGeminiResponse(message, topic, storytellerName, conversationHistory);
    
    // Parse the response to separate conversation from data
    const { conversationalResponse, extractedData } = parseAIResponse(fullResponse);
    console.log('✅ Response generated successfully');
    if (extractedData) {
      console.log('📊 Extracted data:', extractedData);
    }

    // Save to database if storyId is provided
    if (storyId) {
      try {
        console.log('💾 Updating story in database...');
        await updateStoryWithConversation(storyId, message, conversationalResponse, extractedData);
        console.log('✅ Story updated successfully');
      } catch (dbError) {
        console.error('❌ Database update error:', dbError);
        // Continue even if DB update fails
      }
    }
    
    res.json({
      response: conversationalResponse,
      timestamp: new Date().toISOString(),
      extractedData: extractedData || undefined
    });
  } catch (error) {
    console.error('--- GEMINI AI ERROR (FINAL) ---');
    console.error('Both primary and fallback models failed.');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.status) console.error('HTTP Status:', error.status);
    if (error.statusText) console.error('Status text:', error.statusText);
    console.error('Full error:', error);
    console.error('--- END GEMINI AI ERROR ---');
    
    const fallbackResponse = getProfessionalFallback(topic, storytellerName);
    res.status(500).json({
      error: 'The AI service encountered a critical error.',
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      isFallback: true
    });
  }
});

// --- New endpoint to create a story session ---
router.post('/start-session', async (req, res) => {
  console.log('📝 Start session request received:', req.body);
  
  const { storytellerName, topic, interviewMode } = req.body;

  // Check if Story model is loaded
  if (!Story) {
    console.error('❌ Story model not available');
    return res.status(500).json({ 
      error: 'Database model not configured. Check server logs.',
      details: 'Story model failed to load'
    });
  }

  try {
    const newStory = new Story({
      storytellerName,
      topic,
      conversationHistory: [],
      extractedEntities: {
        names: [],
        locations: [],
        dates: [],
        organizations: []
      },
      status: 'processing',
      transcript: '',
      recordingDuration: 0,
      interviewMode: interviewMode || 'voice'
    });

    console.log('💾 Saving new story to database...');
    await newStory.save();
    console.log('✅ Story saved with ID:', newStory._id);

    // Generate initial greeting
    const greeting = `Hello ${storytellerName}. Thank you for sharing your memories about ${topic}. I'm ready to listen when you are.`;
    
    // Save initial AI message
    newStory.conversationHistory.push({
      speaker: 'ai',
      text: greeting,
      timestamp: new Date()
    });
    await newStory.save();
    console.log('✅ Initial greeting saved');

    res.json({
      storyId: newStory._id,
      greeting,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error creating story session:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create story session',
      details: error.message,
      name: error.name
    });
  }
});

// --- New endpoint to complete a story session ---
router.post('/end-session', async (req, res) => {
  const { storyId, recordingDuration } = req.body;

  try {
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Generate transcript from conversation history
    const transcript = story.conversationHistory
      .map(msg => `${msg.speaker === 'user' ? story.storytellerName : 'Interviewer'}: ${msg.text}`)
      .join('\n\n');

    story.transcript = transcript;
    story.status = 'completed';
    story.recordingDuration = recordingDuration || 0;
    await story.save();

    res.json({
      message: 'Story session completed',
      storyId: story._id,
      transcript: story.transcript
    });
  } catch (error) {
    console.error('Error ending story session:', error);
    res.status(500).json({ error: 'Failed to end story session' });
  }
});

async function updateStoryWithConversation(storyId, userMessage, aiResponse, extractedData) {
  const story = await Story.findById(storyId);
  if (!story) {
    throw new Error('Story not found');
  }

  // Add messages to conversation history
  story.conversationHistory.push(
    { speaker: 'user', text: userMessage, timestamp: new Date() },
    { speaker: 'ai', text: aiResponse, timestamp: new Date() }
  );

  // Update extracted entities if data is available
  if (extractedData) {
    if (extractedData.names) {
      story.extractedEntities.names.push(...extractedData.names.filter(
        name => !story.extractedEntities.names.includes(name)
      ));
    }
    if (extractedData.locations) {
      story.extractedEntities.locations.push(...extractedData.locations.filter(
        loc => !story.extractedEntities.locations.includes(loc)
      ));
    }
    if (extractedData.dates) {
      story.extractedEntities.dates.push(...extractedData.dates.filter(
        date => !story.extractedEntities.dates.includes(date)
      ));
    }
    if (extractedData.organizations) {
      story.extractedEntities.organizations.push(...extractedData.organizations.filter(
        org => !story.extractedEntities.organizations.includes(org)
      ));
    }
  }

  await story.save();
  console.log(`✅ Story ${storyId} updated with conversation`);
}

async function generateGeminiResponse(userMessage, topic, storytellerName, history) {
  // Use Gemini 2.5 models
  const primaryModelName = "gemini-2.5-flash-lite";
  const fallbackModelName = "gemini-2.5-flash";
  const prompt = buildProfessionalPrompt(userMessage, topic, storytellerName, history);

  try {
    console.log('🤖 Attempting primary model:', primaryModelName);
    const primaryModel = genAI.getGenerativeModel({ model: primaryModelName });
    const result = await primaryModel.generateContent(prompt);
    const response = result.response.text();
    console.log('✅ Primary model responded successfully');
    return response;
  } catch (primaryError) {
    console.error(`❌ Primary model '${primaryModelName}' failed`);
    console.error('Primary Error:', primaryError.message);
    console.error('Error details:', primaryError);
    
    try {
      console.log('🤖 Attempting fallback model:', fallbackModelName);
      const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
      const result = await fallbackModel.generateContent(prompt);
      const response = result.response.text();
      console.log('✅ Fallback model responded successfully');
      return response;
    } catch (fallbackError) {
      console.error('❌ Fallback model failed:', fallbackError.message);
      console.error('Fallback error details:', fallbackError);
      throw fallbackError;
    }
  }
}

function buildProfessionalPrompt(userMessage, topic, storytellerName, history) {
  const systemPrompt = TOPIC_PROMPTS[topic] || TOPIC_PROMPTS.wisdom;
  const conversationContext = (history || [])
    .slice(-8)
    .map(msg => `${msg.speaker === 'user' ? 'Interviewee' : 'Interviewer'}: ${msg.text}`)
    .join('\n');

  const dataExtractionInstruction = `
After your conversational response, add a special section starting with "[DATA_EXTRACT]".
In this section, list any important named entities from the INTERVIEWEE'S LATEST RESPONSE.
Focus on:
- Names of people (e.g., John Smith)
- Specific locations (e.g., Paris, Main Street)
- Key dates or years (e.g., 1985, last summer)
- Significant organizations (e.g., IBM, the Red Cross)
Format it as a semicolon-separated list. For example: "[DATA_EXTRACT] Names: Maria, David; Locations: New York; Dates: 1992".
If no data is found, write "[DATA_EXTRACT] None".
Your entire output must follow this structure: {Your conversational response.}[DATA_EXTRACT] {Extracted data}.
  `;

  return `${systemPrompt}\n\n${dataExtractionInstruction}\n\nYou are interviewing ${storytellerName} about ${topic}. Your tone is warm, professional, and curious. Keep your responses concise.\n\nCONVERSATION HISTORY:\n${conversationContext}\n\nINTERVIEWEE'S LATEST RESPONSE: "${userMessage}"\n\nYOUR RESPONSE AS INTERVIEWER:`;
}

function parseAIResponse(fullText) {
  const separator = "[DATA_EXTRACT]";
  const separatorIndex = fullText.indexOf(separator);

  if (separatorIndex === -1) {
    return { conversationalResponse: cleanAIResponse(fullText), extractedData: null };
  }

  const conversationalResponse = cleanAIResponse(fullText.substring(0, separatorIndex));
  const extractedDataRaw = fullText.substring(separatorIndex + separator.length).trim();
  
  if (extractedDataRaw.toLowerCase() === 'none') {
    return { conversationalResponse, extractedData: null };
  }
  
  // Parse the "Key: Value; Key: Value" format
  const extractedData = {};
  extractedDataRaw.split(';').forEach(part => {
    const [key, value] = part.split(':').map(s => s.trim());
    if (key && value) {
      extractedData[key.toLowerCase()] = value.split(',').map(s => s.trim());
    }
  });

  return { conversationalResponse, extractedData };
}

function cleanAIResponse(text) {
  return text.replace(/\*/g, '').trim();
}

function getProfessionalFallback(topic, storytellerName) {
  const safeTopic = topic && PROFESSIONAL_QUESTIONS[topic] ? topic : 'wisdom';
  const safeName = storytellerName || 'there';
  const questions = PROFESSIONAL_QUESTIONS[safeTopic];
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  return `Thank you for sharing that, ${safeName}. ${randomQuestion}`;
}

module.exports = router;