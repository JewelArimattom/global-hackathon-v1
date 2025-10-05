const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Attempt to load the Story and Blog models
let Story, Blog;
try {
  Story = require('../models/Story');
  Blog = require('../models/Blog');
  console.log('✅ Story and Blog models loaded successfully');
} catch (error) {
  console.error('❌ Failed to load models. Database operations will be disabled.');
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

// Enhanced blog generation prompt
const ENHANCED_BLOG_PROMPT = `
You are an expert storyteller and professional blog writer. Your task is to transform personal conversations into compelling, well-structured blog posts that capture the essence of human experience.

WRITING STYLE:
- Write in a warm, authentic, and engaging voice
- Use vivid imagery and sensory details
- Create emotional resonance with readers
- Balance reflection with narrative storytelling
- Include thoughtful transitions between ideas
- Use varied sentence structures for rhythm

STRUCTURE REQUIREMENTS:
- Opening Hook: Start with a captivating opening that draws readers in
- Body Sections: Organize content into 4-6 clear thematic sections
- Personal Insights: Weave in reflections and lessons learned
- Memorable Conclusion: End with a powerful takeaway or call to reflection

CONTENT DEPTH:
- Minimum 800 words, maximum 1500 words
- Rich paragraphs with 4-6 sentences each
- Include specific anecdotes and examples
- Connect personal stories to universal themes
- Add depth through introspection and analysis

TONE AND VOICE:
- Authentic and conversational, yet polished
- Emotionally intelligent and empathetic
- Inspirational without being preachy
- Vulnerable yet hopeful
- Relatable to a broad audience
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
      
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 2 && story.autoBlogEnabled && !story.blogPost) {
        console.log('📄 Auto-generating enhanced blog post...');
        generateAndSaveEnhancedBlog(storyId).catch(error => {
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

router.post('/voice-message', async (req, res) => {
  const { storyId, storytellerName, message } = req.body;
  
  console.log('🎤 Voice message received:', {
    storyId: storyId,
    storytellerName: storytellerName,
    message: message
  });

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    let conversationHistory = [];
    if (storyId && Story) {
      const story = await Story.findById(storyId);
      if (story) {
        conversationHistory = story.conversationHistory || [];
      }
    }

    const friendlyResponse = await generateAcknowledgement(message, conversationHistory, storytellerName);

    if (storyId && Story) {
      await updateStoryWithVoice(storyId, message, friendlyResponse);
      
      const story = await Story.findById(storyId);
      const userMessages = story.conversationHistory.filter(msg => msg.speaker === 'user');
      if (userMessages.length >= 2 && story.autoBlogEnabled && !story.blogPost) {
        console.log('📄 Auto-generating enhanced blog post after voice...');
        generateAndSaveEnhancedBlog(storyId).catch(error => {
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

// Enhanced blog generation endpoint
router.post('/generate-blog', async (req, res) => {
  const { storyId, quality = 'standard' } = req.body;
  
  if (!storyId || !Story) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const blogData = await generateAndSaveEnhancedBlog(storyId, quality);
    
    res.json({
      success: true,
      ...blogData,
      message: 'Enhanced blog post generated successfully'
    });

  } catch (error) {
    console.error('🔴 Error generating blog post:', error);
    res.status(500).json({
      error: 'Failed to generate blog post',
      message: error.message || 'Could not generate blog post from conversation'
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
    
    if (!story.blogPost && story.autoBlogEnabled) {
      try {
        const blogData = await generateAndSaveEnhancedBlog(storyId);
        console.log('✅ Enhanced blog post generated automatically');
      } catch (blogError) {
        console.error('❌ Failed to generate blog post:', blogError);
      }
    }
    
    await story.save();
    
    console.log(`✅ Story session completed: ${storyId}`);
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
    console.log(`✅ Updated story ${storyId}`);
  } catch (dbError) {
    console.error(`❌ Database update error:`, dbError);
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
    console.log(`✅ Updated story with voice`);
  } catch (dbError) {
    console.error(`❌ Database update error:`, dbError);
  }
}

async function generateAndSaveEnhancedBlog(storyId, quality = 'standard') {
  if (!isApiKeyAvailable) {
    throw new Error('AI service not available');
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

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    const wordCount = quality === 'premium' ? '1200-1500' : quality === 'basic' ? '600-800' : '800-1200';

    const prompt = `
      ${ENHANCED_BLOG_PROMPT}

      CONVERSATION CONTENT:
      ${userMessages}

      AUTHOR: ${story.storytellerName}
      TOPIC: ${story.topic || 'Personal Journey'}
      
      TARGET LENGTH: ${wordCount} words
      QUALITY LEVEL: ${quality}

      Create a deeply engaging, professionally written blog post. Structure it with:
      
      1. CAPTIVATING TITLE (50-70 characters)
      2. COMPELLING SUBTITLE (100-150 characters) 
      3. OPENING HOOK (1-2 paragraphs that draw readers in immediately)
      4. MAIN BODY (4-6 thematic sections with clear headings)
         - Each section should be 150-250 words
         - Include vivid details and emotional depth
         - Connect personal experience to universal themes
      5. POWERFUL CONCLUSION (2-3 paragraphs)
         - Reflect on the journey
         - Leave readers with inspiration or insight
      6. METADATA (5-8 relevant tags, reading category)

      FORMAT: Return ONLY valid JSON without markdown:
      {
        "title": "The Main Title",
        "subtitle": "An engaging subtitle that expands on the title",
        "content": "Full blog post with clear section breaks using \\n\\n## Section Heading\\n\\nContent...",
        "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
        "category": "personal-story",
        "excerpt": "A compelling 2-3 sentence preview"
      }

      Make this blog post exceptional - something readers will want to share and remember.
      Focus on authentic storytelling, emotional resonance, and universal human themes.
    `;

    console.log('🤖 Generating enhanced blog post with Gemini 2.0...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    console.log('📝 Raw blog generation response received');
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const blogData = JSON.parse(jsonMatch[0]);
    
    // Validate blog data
    if (!blogData.title || !blogData.content) {
      throw new Error('Invalid blog data generated - missing required fields');
    }

    // Save to Story model
    await Story.findByIdAndUpdate(storyId, {
      blogTitle: blogData.title,
      blogPost: blogData.content,
      blogTags: blogData.tags || [],
      blogGeneratedAt: new Date()
    });

    // Save to Blog collection
    if (Blog) {
      const newBlog = new Blog({
        storyId: story._id,
        authorName: story.storytellerName,
        title: blogData.title,
        subtitle: blogData.subtitle || '',
        content: blogData.content,
        tags: blogData.tags || [],
        category: blogData.category || 'personal-story',
        excerpt: blogData.excerpt || blogData.content.substring(0, 300) + '...',
        status: 'published',
        generationMethod: 'enhanced',
        generationQuality: quality,
        publishedAt: new Date()
      });

      await newBlog.save();
      console.log(`✅ Enhanced blog saved to collection: ${newBlog._id}`);
      
      return {
        blogId: newBlog._id,
        blogTitle: newBlog.title,
        blogSubtitle: newBlog.subtitle,
        blogContent: newBlog.content,
        blogTags: newBlog.tags,
        blogCategory: newBlog.category,
        blogExcerpt: newBlog.excerpt,
        slug: newBlog.slug,
        readingTime: newBlog.readingTime
      };
    }

    return {
      blogTitle: blogData.title,
      blogSubtitle: blogData.subtitle,
      blogContent: blogData.content,
      blogTags: blogData.tags,
      blogCategory: blogData.category,
      blogExcerpt: blogData.excerpt
    };

  } catch (error) {
    console.error('🔴 Error generating enhanced blog:', error);
    throw error;
  }
}

async function generateAcknowledgement(userMessage, history, storytellerName) {
  if (!genAI) {
    return "I'm listening... (Test Mode)";
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
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
    console.error(`🔴 GEMINI ERROR:`, error);
    return "I'm listening. Please continue...";
  }
}

async function generateFinalSummary(conversationHistory, storytellerName) {
  if (!isApiKeyAvailable) return "Summary generation is disabled in test mode.";
  
  const transcript = conversationHistory
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.text)
    .join('\n\n');
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
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
    console.error(`🔴 GEMINI ERROR:`, error);
    return `A summary could not be generated for this conversation with ${storytellerName}.`;
  }
}

module.exports = router;