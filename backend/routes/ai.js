const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Professional interview prompts for different topics
const TOPIC_PROMPTS = {
  childhood: `You are a compassionate oral history interviewer specializing in childhood memories. Your role is to draw out detailed, emotional stories about growing up, family life, early experiences, and formative moments. Ask open-ended questions that encourage reflection and detail. Focus on sensory memories, emotions, and significant events that shaped their childhood.`,

  family: `You are a genealogical researcher documenting family histories. Your goal is to capture rich family stories, traditions, relationships, and heritage. Ask about family rituals, important relatives, family values, and stories passed through generations. Draw out emotional connections and family dynamics.`,

  career: `You are a professional biographer documenting career journeys. Focus on career milestones, challenges, achievements, and lessons learned. Ask about professional growth, mentors, pivotal moments, and the evolution of their work life. Draw out stories of perseverance and success.`,

  love: `You are a relationship historian capturing love stories and romantic journeys. Focus on meeting stories, relationship milestones, challenges overcome, and what makes their love unique. Draw out emotional details and significant moments in their relationship history.`,

  wisdom: `You are a wisdom collector preserving life lessons and philosophical insights. Your role is to draw out hard-earned wisdom, values, beliefs, and advice for future generations. Ask about turning points, difficult decisions, and what truly matters in life.`,

  travel: `You are an adventure chronicler documenting travel experiences and cultural encounters. Focus on transformative journeys, memorable places, cultural insights, and personal growth through travel. Draw out sensory details and emotional impacts of their adventures.`
};

// Professional question banks
const PROFESSIONAL_QUESTIONS = {
  childhood: [
    "Take me back to your earliest childhood memory. What do you see, hear, and feel?",
    "Describe the neighborhood where you grew up. What made it special?",
    "What were your favorite games or activities as a child, and why did you love them?",
    "Tell me about a teacher or adult who significantly influenced your childhood.",
    "What family traditions from your childhood do you still cherish today?",
    "Describe a challenge you faced as a child and how it shaped you.",
    "What was your most treasured possession as a child, and what made it special?",
    "How did your childhood dreams and aspirations compare to how your life actually unfolded?"
  ],

  family: [
    "What's the most important story that's been passed down through your family?",
    "Describe your family's cultural or religious traditions and what they mean to you.",
    "Who in your family has had the greatest influence on you, and why?",
    "What family heirlooms or artifacts carry special meaning for your family?",
    "Tell me about a time your family came together during a difficult period.",
    "How have your family relationships evolved over the years?",
    "What values did your parents instill in you that you've carried throughout life?",
    "Describe a favorite family gathering or celebration that stands out in your memory."
  ],

  career: [
    "What drew you to your chosen career path, and was it what you expected?",
    "Describe a pivotal moment in your career that changed your trajectory.",
    "What was the most valuable professional lesson you learned the hard way?",
    "Tell me about a mentor who significantly impacted your professional development.",
    "How did you navigate major career transitions or challenges?",
    "What accomplishment are you most proud of in your professional life?",
    "How has your definition of success evolved throughout your career?",
    "What advice would you give someone just starting in your field today?"
  ],

  love: [
    "Tell me the story of how you met your partner and knew they were special.",
    "What challenges has your relationship overcome that made it stronger?",
    "Describe a moment when you realized the depth of your love.",
    "How has your love evolved and deepened over time?",
    "What qualities in your partner do you most admire and appreciate?",
    "Share a memory that perfectly captures the essence of your relationship.",
    "What lessons has love taught you about yourself and life?",
    "How do you keep the connection strong through life's changes and challenges?"
  ],

  wisdom: [
    "What's the most important life lesson you've learned, and how did you learn it?",
    "If you could give your younger self one piece of advice, what would it be?",
    "What values have guided your most important life decisions?",
    "How has your perspective on happiness and fulfillment changed over the years?",
    "What does it mean to live a good life, in your experience?",
    "Describe a time when you had to make a difficult decision that shaped your life.",
    "What have you learned about resilience and overcoming adversity?",
    "What wisdom would you most want to pass on to future generations?"
  ],

  travel: [
    "Describe a travel experience that fundamentally changed your perspective.",
    "What's the most memorable place you've visited, and what made it special?",
    "Tell me about a cultural encounter that deeply impacted you.",
    "What travel adventure taught you the most about yourself?",
    "Describe a moment of pure wonder or awe during your travels.",
    "How has traveling influenced your understanding of the world and your place in it?",
    "What's the most valuable lesson you've learned from your journeys?",
    "Describe a travel challenge that became a meaningful part of your story."
  ]
};

// Enhanced AI chat endpoint with Gemini
router.post('/chat', async (req, res) => {
  try {
    const { message, topic, storytellerName, conversationHistory } = req.body;

    const response = await generateGeminiResponse(message, topic, storytellerName, conversationHistory);
    
    res.json({
      response,
      timestamp: new Date().toISOString(),
      suggestedFollowUp: getSuggestedFollowUp(topic)
    });

  } catch (error) {
    console.error('AI chat error:', error);
    // Fallback to professional questions
    const fallbackResponse = getProfessionalFallback(topic, req.body.storytellerName);
    res.json({
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      isFallback: true
    });
  }
});

// Generate response using Gemini AI
async function generateGeminiResponse(userMessage, topic, storytellerName, history) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = buildProfessionalPrompt(userMessage, topic, storytellerName, history);
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return cleanAIResponse(text);
}

function buildProfessionalPrompt(userMessage, topic, storytellerName, history) {
  const systemPrompt = TOPIC_PROMPTS[topic] || TOPIC_PROMPTS.wisdom;
  
  const conversationContext = history
    .slice(-8)
    .map(msg => `${msg.speaker === 'user' ? 'Interviewee' : 'Interviewer'}: ${msg.text}`)
    .join('\n');

  return `${systemPrompt}

You are interviewing ${storytellerName} about ${topic}. Maintain a warm, professional, and curious tone. Build on previous conversation naturally.

CONVERSATION HISTORY:
${conversationContext}

INTERVIEWEE'S LATEST RESPONSE: "${userMessage}"

YOUR RESPONSE AS INTERVIEWER:
- Acknowledge and validate their response
- Ask a thoughtful follow-up question that digs deeper
- Keep responses to 1-2 sentences maximum for natural conversation flow
- Maintain professional oral history interview style
- Focus on drawing out specific details and emotions
- Use their name occasionally to personalize (${storytellerName})`;
}

function cleanAIResponse(text) {
  // Remove any markdown formatting and clean up the response
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italics
    .replace(/[""]/g, '"') // Normalize quotes
    .trim();
}

function getProfessionalFallback(topic, storytellerName) {
  const questions = PROFESSIONAL_QUESTIONS[topic] || PROFESSIONAL_QUESTIONS.wisdom;
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  
  return `Thank you for sharing that, ${storytellerName}. ${randomQuestion}`;
}

function getSuggestedFollowUp(topic) {
  const questions = PROFESSIONAL_QUESTIONS[topic] || PROFESSIONAL_QUESTIONS.wisdom;
  return questions[Math.floor(Math.random() * questions.length)];
}

// Vapi integration endpoint (optional)
router.post('/vapi/start', async (req, res) => {
  try {
    const { storytellerName, topic, phoneNumber } = req.body;

    const vapiResponse = await axios.post(
      `${process.env.VAPI_BASE_URL}/call`,
      {
        phoneNumber,
        assistant: {
          firstMessage: `Hello ${storytellerName}, I'm calling to interview you about ${topic}. Are you ready to begin sharing your stories?`,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            systemPrompt: TOPIC_PROMPTS[topic]
          },
          voice: 'jennifer-playht'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ callId: vapiResponse.data.id, status: 'started' });
  } catch (error) {
    console.error('Vapi error:', error);
    res.status(500).json({ error: 'Failed to start phone interview' });
  }
});

module.exports = router;