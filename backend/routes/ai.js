const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

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

// --- Core AI Persona and Story Modules ---
const BIOGRAPHER_SYSTEM_PROMPT = `
You are "Remi," a warm, friendly, and patient family biographer. 
Your goal is to gently guide a grandparent in sharing their life stories.
- Your tone is encouraging, curious, and gentle.
- Ask one open-ended, reflective question at a time to encourage storytelling.
- Keep your questions concise and easy to understand.
- Weave their name into the conversation naturally to make it personal.
- Your purpose is to gather memories that can be turned into a beautiful story.
`;

const STORY_MODULES = {
    childhood: "To begin, could you share one of your favorite memories from when you were a young child?",
    school: "Let's talk about your school days. What was your favorite subject or who was a teacher that you'll never forget?",
    career: "I'd love to hear about your work life. What was the very first job you ever had?",
    family: "Family is so important. Could you tell me the story of how you met your spouse or a cherished memory of starting your family?",
    wisdom: "Looking back on your life, what is one piece of advice you feel is most important to pass on?",
    default: "I'm so glad we have this time to talk. To start, could you share a memory that makes you smile?"
};

// --- API Endpoints ---

router.get('/health', (req, res) => {
  if (isApiKeyAvailable && genAI) {
    res.status(200).json({ status: 'OK', message: 'AI Biographer is ready.' });
  } else {
    res.status(503).json({ status: 'UNAVAILABLE', message: 'AI service is not configured. GEMINI_API_KEY is missing.' });
  }
});

router.post('/start-session', async (req, res) => {
  const { storytellerName, topic, interviewMode } = req.body;
  if (!Story) return res.status(500).json({ error: 'Database model not configured.' });
  try {
    const safeTopic = topic && STORY_MODULES[topic] ? topic : 'default';
    const firstQuestion = STORY_MODULES[safeTopic];
    const greeting = `Hello ${storytellerName}! I'm Remi, your family biographer. ${firstQuestion}`;
    const newStory = new Story({
      storytellerName,
      topic: safeTopic,
      conversationHistory: [{ speaker: 'ai', text: greeting, timestamp: new Date() }],
      status: 'processing',
      interviewMode: interviewMode || 'voice'
    });
    await newStory.save();
    console.log(`✅ New story session started for ${storytellerName} on topic '${safeTopic}'. ID: ${newStory._id}`);
    res.json({ storyId: newStory._id, greeting, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error creating story session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

router.post('/chat', async (req, res) => {
  const { message, conversationHistory, storyId, storytellerName } = req.body;
  if (!isApiKeyAvailable) {
    return res.json({ response: `Thank you for sharing that, ${storytellerName}. (Test Mode)`, timestamp: new Date().toISOString() });
  }
  try {
    const followUpQuestion = await generateFollowUp(message, conversationHistory, storytellerName);
    if (storyId) {
      await updateStory(storyId, message, followUpQuestion);
    }
    res.json({ response: followUpQuestion, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('🔴 A critical error occurred in the /chat endpoint:', error);
    const fallbackResponse = `I'm having trouble connecting right now. Let's try that again in a moment.`;
    res.status(500).json({
      error: 'The AI service failed to generate a response.',
      response: fallbackResponse,
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
    const blogPostContent = await generateBlogPost(story.conversationHistory, story.storytellerName);
    story.summary = blogPostContent;
    story.transcript = story.conversationHistory.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
    story.status = 'completed';
    story.recordingDuration = recordingDuration || 0;
    await story.save();
    console.log(`✅ Blog post generated and saved for story ID: ${storyId}`);
    res.json({
      message: 'Story session completed and blog post created!',
      storyId: story._id,
      blogPost: blogPostContent,
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
      $push: { conversationHistory: { $each: [
        { speaker: 'user', text: userMessage, timestamp: new Date() },
        { speaker: 'ai', text: aiResponse, timestamp: new Date() }
      ]}}
    });
  } catch (dbError) {
    console.error(`❌ Database update error for story ${storyId}:`, dbError);
  }
}

async function generateFollowUp(userMessage, history, storytellerName) {
  // Using the user-specified primary model name
  const primaryModelName = "gemini-2.5-flash-lite";
  const model = genAI.getGenerativeModel({ model: primaryModelName });

  const conversationContext = (history || []).slice(-10).map(msg => `${msg.speaker === 'user' ? storytellerName : 'Remi (Interviewer)'}: ${msg.text}`).join('\n');
  const prompt = `${BIOGRAPHER_SYSTEM_PROMPT}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\n${storytellerName}: "${userMessage}"\n\nRemi (Interviewer):`;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch(error) {
    console.error(`--- 🔴 GEMINI ERROR (${primaryModelName}) ---`);
    console.error("Failed to generate follow-up question. This may be due to an invalid model name, API key, or billing issue.");
    console.error("Full Error:", error);
    throw new Error("Gemini API call failed.");
  }
}

async function generateBlogPost(conversationHistory, storytellerName) {
  if (!isApiKeyAvailable) return "Blog post generation is disabled in test mode.";
  const grandparentTranscript = conversationHistory.filter(msg => msg.speaker === 'user').map(msg => msg.text).join('\n\n');
  
  // Using the user-specified fallback model name
  const fallbackModelName = "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: fallbackModelName });
  
  const prompt = `
    You are an expert storyteller who writes heartfelt family blog posts.
    Transform the following collection of memories from a grandparent named ${storytellerName} into a beautiful, narrative blog post.
    **Instructions:**
    1. **Title:** Create a warm title like "A Chapter from ${storytellerName}'s Story".
    2. **Voice:** Write in a first-person narrative, as if ${storytellerName} is telling the story.
    3. **Structure:** Organize the memories into paragraphs with logical flow. Use markdown for headings.
    4. **Tone:** Make it feel nostalgic, warm, and full of wisdom.
    5. **Format:** The final output must be in clean Markdown.
    **Memories from ${storytellerName}:**
    ---
    ${grandparentTranscript}
    ---
  `;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch(error) {
    console.error(`--- 🔴 GEMINI ERROR (${fallbackModelName}) ---`);
    console.error("Failed to generate the final blog post.");
    console.error("Full Error:", error);
    return `## A Story from ${storytellerName}\n\n(An error occurred during blog post generation, but the memories have been saved.)`;
  }
}

module.exports = router;