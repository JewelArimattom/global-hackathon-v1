const express = require('express');
const axios = require('axios');
const router = express.Router();
const Story = require('../models/Story');

// Vapi configuration
const VAPI_CONFIG = {
  baseURL: 'https://api.vapi.ai',
  timeout: 30000
};

// Store active calls to manage their state during the session
const activeCalls = new Map();

/**
 * @route   POST /api/vapi/start-call
 * @desc    Initiates a phone call using a Vapi workflow.
 * @access  Public
 */
router.post('/start-call', async (req, res) => {
  try {
    const { storytellerName, topic, phoneNumber, email } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Call the Vapi API to start the phone interview using the specific workflow
    const vapiResponse = await axios.post(
      `${VAPI_CONFIG.baseURL}/call/workflow`,
      {
        workflowId: '020b77a4-a562-4617-bf9e-a0d1a052f913', // Your specific Workflow ID
        phoneNumber: formatPhoneNumber(phoneNumber),
        variables: { // These variables are passed to the workflow's prompt
          storytellerName: storytellerName,
          topic: topic
        },
        metadata: { // Extra data for tracking and webhooks
          storytellerName,
          topic,
          email,
          startTime: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: VAPI_CONFIG.timeout
      }
    );

    const callData = vapiResponse.data;

    // Store initial call information in memory
    activeCalls.set(callData.id, {
      callId: callData.id,
      storytellerName,
      topic,
      phoneNumber,
      startTime: new Date(),
      status: 'started',
      conversation: []
    });

    console.log(`Call initiated: ${callData.id} to ${phoneNumber}`);

    res.json({
      callId: callData.id,
      status: callData.status,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('Vapi start-call error:', error.response?.data || error.message);

    if (error.response?.status === 402) {
      return res.status(402).json({
        error: 'Insufficient Vapi credits. Please add credits to your account.'
      });
    }

    res.status(500).json({
      error: 'Failed to start phone call',
      details: error.response?.data?.message || error.message
    });
  }
});


/**
 * @route   POST /api/vapi/webhook
 * @desc    Receives real-time updates from Vapi about the call.
 * @access  Public
 */
router.post('/webhook', async (req, res) => {
  try {
    const { type, call, transcript } = req.body;

    if (!call || !call.id) {
        console.log('Webhook received without a valid call object:', req.body);
        return res.status(200).send('OK');
    }

    console.log(`Vapi webhook received: ${type} for call ${call.id}`);

    // Handle different types of webhook events
    switch (type) {
      case 'call-start':
        handleCallStart(call);
        break;
      case 'call-end':
        await handleCallEnd(call);
        break;
      case 'transcript':
        if (transcript) {
            handleTranscriptUpdate(call.id, transcript);
        }
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// --- Webhook Helper Functions ---

function handleCallStart(call) {
  const callId = call.id;
  if (activeCalls.has(callId)) {
    const callData = activeCalls.get(callId);
    callData.status = 'in-progress';
  }
  console.log(`Call ${callId} is now in progress.`);
}

async function handleCallEnd(call) {
  const callId = call.id;
  if (activeCalls.has(callId)) {
    const callData = activeCalls.get(callId);
    callData.status = 'completed';
    callData.endTime = new Date();
    callData.duration = (callData.endTime - callData.startTime) / 1000;

    // Save the complete interview record to the database
    await savePhoneInterview(callData);
    activeCalls.delete(callId);
    console.log(`Call ${callId} ended and has been saved.`);
  }
}

function handleTranscriptUpdate(callId, transcript) {
  if (activeCalls.has(callId)) {
    const callData = activeCalls.get(callId);
    if (transcript.type === 'transcript' && transcript.role && transcript.transcript) {
      callData.conversation.push({
        speaker: transcript.role === 'user' ? 'user' : 'ai',
        text: transcript.transcript,
        timestamp: new Date()
      });
    }
  }
}

// --- Database & Utility Functions ---

async function savePhoneInterview(callData) {
  try {
    const conversationHistory = callData.conversation || [];
    const fullTranscript = conversationHistory
      .map(msg => `${msg.speaker === 'user' ? callData.storytellerName : 'Anna'}: ${msg.text}`)
      .join('\n\n');

    const story = new Story({
      storytellerName: callData.storytellerName,
      topic: callData.topic,
      recordingDuration: callData.duration || 0,
      transcript: fullTranscript,
      conversationHistory: conversationHistory,
      status: 'completed',
      interviewType: 'phone',
      callMetadata: {
        callId: callData.callId,
        phoneNumber: callData.phoneNumber,
        startTime: callData.startTime,
        endTime: callData.endTime,
        duration: callData.duration
      }
    });

    await story.save();
    console.log(`Interview with ${callData.storytellerName} saved successfully.`);

  } catch (error) {
    console.error('Error saving phone interview to database:', error);
  }
}

function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}


module.exports = router;
    