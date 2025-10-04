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
      status: 'processing',
      interviewMode: interviewMode || 'voice',
      blogPost: '',
      blogTitle: '',
      blogTags: [],
      autoBlogEnabled: true
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
      
      // Auto-generate blog after sufficient conversation
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 2 && story.autoBlogEnabled && !story.blogPost) {
        console.log('🔄 Auto-generating blog post after sufficient conversation...');
        // Generate blog in background without blocking response
        generateAndSaveBlogPost(storyId).catch(error => {
          console.error('❌ Auto-blog generation failed:', error.message);
        });
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

// Direct voice message processing
router.post('/voice-message', async (req, res) => {
  const { storyId, storytellerName, message } = req.body;
  
  console.log('🎤 Voice message received (direct processing):', {
    storyId: storyId,
    storytellerName: storytellerName,
    message: message
  });

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    // Get AI response directly
    let conversationHistory = [];
    if (storyId && Story) {
      const story = await Story.findById(storyId);
      if (story) {
        conversationHistory = story.conversationHistory || [];
      }
    }

    const friendlyResponse = await generateAcknowledgement(message, conversationHistory, storytellerName);

    // Update database
    if (storyId && Story) {
      await updateStoryWithVoice(storyId, message, friendlyResponse);
      
      // Auto-generate blog after voice messages
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 2 && story.autoBlogEnabled && !story.blogPost) {
        console.log('🔄 Auto-generating blog post after voice message...');
        // Generate blog in background
        generateAndSaveBlogPost(storyId).catch(error => {
          console.error('❌ Auto-blog generation failed:', error.message);
        });
      }
    }

    res.json({
      response: friendlyResponse,
      transcribedText: message,
      timestamp: new Date().toISOString(),
      storyId: storyId
    });

  } catch (error) {
    console.error('🔴 Error processing voice message:', error);
    res.status(500).json({
      error: 'Failed to process voice message',
      response: "I couldn't process that. Could you please try again?",
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

async function updateStoryWithVoice(storyId, userMessage, aiResponse) {
  try {
    await Story.findByIdAndUpdate(storyId, { 
      $push: { 
        conversationHistory: { 
          $each: [
            { 
              speaker: 'user', 
              text: userMessage, 
              timestamp: new Date(),
              isVoice: true
            },
            { speaker: 'ai', text: aiResponse, timestamp: new Date() }
          ]
        }
      }
    });
    console.log(`✅ Updated story ${storyId} with voice conversation`);
  } catch (dbError) {
    console.error(`❌ Database update error for story ${storyId}:`, dbError);
  }
}

async function generateAndSaveBlogPost(storyId) {
  if (!isApiKeyAvailable) {
    const blogData = {
      blogTitle: "A Personal Story Journey",
      blogContent: "This is a sample blog post that would be generated from your conversation in production mode.",
      blogTags: ["personal", "story", "journey"]
    };
    
    if (Story) {
      await Story.findByIdAndUpdate(storyId, {
        ...blogData,
        blogGeneratedAt: new Date()
      });
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

    if (!userMessages || userMessages.trim().length === 0) {
      throw new Error('No user messages found to generate blog from');
    }

    // Use correct Gemini model names
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    const prompt = `
      Create a compelling, well-structured blog post based on the following personal conversation. 
      The blog should capture the essence of the story while making it engaging for readers.

      CONVERSATION CONTENT:
      ${userMessages}

      REQUIREMENTS:
      - Create a catchy, emotional title (max 60 characters)
      - Write 400-600 words of engaging content
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
      Focus on the personal stories and emotional journey shared in the conversation.
    `;

    console.log('🤖 Generating blog post with Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    console.log('📝 Raw blog generation response:', responseText);
    
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
          blogTags: blogData.blogTags || [],
          blogGeneratedAt: new Date()
        });
      }

      console.log('✅ Blog post generated and saved:', blogData.blogTitle);
      return blogData;
    } else {
      console.error('❌ Could not extract JSON from response:', responseText);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('🔴 Error generating blog post:', error);
    
    // Fallback blog post
    const fallbackBlog = {
      blogTitle: "A Personal Journey of Discovery",
      blogContent: `This blog post captures the personal stories and insights shared in a recent conversation. 

The speaker reflected on various life experiences, lessons learned, and moments that shaped their perspective. Through heartfelt sharing, they revealed the journey of personal growth and the wisdom gained along the way.

While the full depth of the conversation is preserved in our records, this blog serves as a testament to the power of personal storytelling and the profound insights that emerge when we take time to reflect on our life's journey.

Every story shared becomes part of a larger narrative about human experience, connection, and the continuous process of learning and growing.`,
      blogTags: ["personal-growth", "storytelling", "reflection", "life-journey"]
    };

    if (Story) {
      await Story.findByIdAndUpdate(storyId, {
        ...fallbackBlog,
        blogGeneratedAt: new Date()
      });
    }

    return fallbackBlog;
  }
}

async function generateAcknowledgement(userMessage, history, storytellerName) {
  if (!genAI) {
    return "I'm listening... (Test Mode)";
  }

  // Use correct model name
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
  
  // Use correct model name
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