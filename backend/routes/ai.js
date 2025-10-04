const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini AI with your API key from .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompts defining the AI's persona for each topic
const TOPIC_PROMPTS = {
  childhood: `You are a compassionate oral history interviewer specializing in childhood memories. Your role is to draw out detailed, emotional stories about growing up and formative moments. Ask open-ended questions that encourage reflection. Focus on sensory memories, emotions, and significant events.`,
  family: `You are a genealogical researcher documenting family histories. Your goal is to capture rich family stories, traditions, relationships, and heritage. Ask about family rituals, important relatives, and stories passed through generations.`,
  career: `You are a professional biographer documenting career journeys. Focus on career milestones, challenges, achievements, and lessons learned. Ask about professional growth, mentors, and pivotal moments.`,
  love: `You are a relationship historian capturing love stories. Focus on meeting stories, relationship milestones, challenges overcome, and what makes their love unique. Draw out emotional details and significant moments.`,
  wisdom: `You are a wisdom collector preserving life lessons and philosophical insights. Your role is to draw out hard-earned wisdom, values, beliefs, and advice for future generations. Ask about turning points and what truly matters in life.`,
  travel: `You are an adventure chronicler documenting travel experiences. Focus on transformative journeys, memorable places, cultural insights, and personal growth through travel. Draw out sensory details and emotional impacts of their adventures.`
};

/**
 * @route   POST /api/ai/chat
 * @desc    Generates an AI response for the voice interview.
 * @access  Public
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, topic, storytellerName, conversationHistory } = req.body;

    if (!message || !topic || !storytellerName || !conversationHistory) {
        return res.status(400).json({ error: 'Missing required fields for AI chat.' });
    }

    const responseText = await generateGeminiResponse(message, topic, storytellerName, conversationHistory);

    res.json({
      response: responseText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to get AI response.',
      details: error.message,
      response: "I'm sorry, I seem to be having a little trouble thinking. Could you please repeat that?",
      isFallback: true
    });
  }
});

// Generates a response using the Gemini AI model
async function generateGeminiResponse(userMessage, topic, storytellerName, history) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const systemPrompt = TOPIC_PROMPTS[topic] || TOPIC_PROMPTS.wisdom;

  // Create a concise conversation history for context
  const conversationContext = history
    .slice(-8) // Use the last 8 messages for context
    .map(msg => `${msg.speaker === 'user' ? 'Interviewee' : 'Interviewer'}: ${msg.text}`)
    .join('\n');

  // The complete prompt sent to Gemini
  const fullPrompt = `${systemPrompt}

You are interviewing ${storytellerName} about their memories related to ${topic}.
Your tone should be warm, professional, and genuinely curious.
Build on the previous conversation naturally. Keep your responses concise (1-2 sentences) to maintain a smooth conversational flow.

CONVERSATION HISTORY:
${conversationContext}

INTERVIEWEE'S LATEST RESPONSE: "${userMessage}"

YOUR RESPONSE AS INTERVIEWER (ask a thoughtful follow-up question):`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();

  return cleanAIResponse(text);
}

// Cleans up the raw text from the AI
function cleanAIResponse(text) {
  // Removes markdown and trims whitespace
  return text
    .replace(/[*_`]/g, '')
    .trim();
}

module.exports = router;
