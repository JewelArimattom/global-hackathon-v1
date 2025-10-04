import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, ArrowRight, AlertTriangle, Wifi, Save, CheckCircle2 } from 'lucide-react';

// Types
interface ConversationMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp?: Date;
  isFallback?: boolean;
}

interface AIResponse {
  response: string;
  timestamp: string;
  extractedData?: any;
  isFallback?: boolean;
}

interface DebugInfo {
  error: string;
  message: string;
  isOnline: boolean;
  timestamp: string;
}

// --- AI Character Component ---
const AiCharacter = ({ status }: { status: 'idle' | 'thinking' | 'speaking' }) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'speaking':
        return 'ring-4 ring-green-400 ring-offset-4 ring-offset-gray-100 animate-pulse';
      case 'thinking':
        return 'ring-4 ring-blue-400 ring-offset-4 ring-offset-gray-100 animate-pulse';
      default:
        return 'ring-2 ring-gray-300 ring-offset-4 ring-offset-gray-100';
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <img
        src="https://i.pravatar.cc/150?u=anna-ai"
        alt="AI Interviewer Anna"
        className={`w-32 h-32 rounded-full object-cover transition-all duration-300 ${getStatusClasses()}`}
      />
      <h3 className="mt-4 text-xl font-semibold text-gray-800">Anna</h3>
      <p className="text-sm text-gray-500">Your AI Interviewer</p>
      <div className="mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
        {status === 'speaking' ? 'Speaking...' : status === 'thinking' ? 'Thinking...' : 'Ready to Listen'}
      </div>
    </div>
  );
};

export default function RecordingStoriesPage() {
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [storytellerName, setStorytellerName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 3;

  const topics = [
    { id: 'childhood', title: 'Childhood Memories', icon: '🎈' },
    { id: 'family', title: 'Family Stories', icon: '👨‍👩‍👧‍👦' },
    { id: 'career', title: 'Work & Career', icon: '💼' },
    { id: 'love', title: 'Love & Marriage', icon: '💕' },
    { id: 'wisdom', title: 'Life Lessons', icon: '💡' },
    { id: 'travel', title: 'Adventures & Travel', icon: '✈️' },
  ];

  // Test backend connection
  const testBackendConnection = async () => {
    setIsTestingConnection(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const data = await response.json();
        setIsBackendConnected(true);
        console.log('✅ Backend connection successful:', data);
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error: any) {
      setIsBackendConnected(false);
      setErrorMessage('Cannot connect to backend server. Please make sure it is running on port 5000.');
      console.error('❌ Backend connection failed:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test AI service connection
  const testAIConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/health');
      if (response.ok) {
        console.log('✅ AI service is ready');
        return true;
      } else {
        throw new Error('AI service not ready');
      }
    } catch (error) {
      console.error('❌ AI service connection failed:', error);
      return false;
    }
  };

  // Start a new story session
  const startStorySession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storytellerName,
          topic: selectedTopic,
          interviewMode: 'voice'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start story session');
      }

      const data = await response.json();
      setCurrentStoryId(data.storyId);
      setRecordingStartTime(Date.now());
      
      // Add greeting to conversation
      const greeting: ConversationMessage = {
        speaker: 'ai',
        text: data.greeting,
        timestamp: new Date()
      };
      setConversationHistory([greeting]);
      
      return data.greeting;
    } catch (error: any) {
      console.error('Error starting story session:', error);
      throw error;
    }
  };

  // End story session and save
  const endStorySession = async () => {
    if (!currentStoryId || !recordingStartTime) return;

    setIsSaving(true);
    try {
      const recordingDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
      
      const response = await fetch('http://localhost:5000/api/ai/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: currentStoryId,
          recordingDuration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save story session');
      }

      const data = await response.json();
      console.log('✅ Story saved successfully:', data);
      
      // Show success message
      setErrorMessage('');
      alert('Story saved successfully! You can view it in your stories list.');
      
      // Reset to start
      setStep(1);
      setStorytellerName('');
      setSelectedTopic('');
      setConversationHistory([]);
      setCurrentStoryId(null);
      setRecordingStartTime(null);
    } catch (error: any) {
      console.error('Error saving story:', error);
      setErrorMessage('Failed to save story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartInterview = async () => {
    setErrorMessage('');
    setDebugInfo(null);
    setRetryCount(0);
    
    // Test connection before starting
    if (!isBackendConnected) {
      await testBackendConnection();
      if (!isBackendConnected) {
        setErrorMessage('Please ensure the backend server is running on port 5000');
        return;
      }
    }

    if (!storytellerName || !selectedTopic) {
      setErrorMessage("Please provide the storyteller's name and select a topic.");
      return;
    }

    // Test AI connection
    const aiReady = await testAIConnection();
    if (!aiReady) {
      setErrorMessage('AI service is not ready. Please check your API key and try again.');
      return;
    }

    setStep(2);
  };

  const generateAIResponse = async (userInput: string, history: ConversationMessage[]): Promise<AIResponse> => {
    setAiStatus('thinking');
    
    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userInput, 
          topic: selectedTopic, 
          storytellerName,
          conversationHistory: history,
          storyId: currentStoryId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to AI service. Please check if the server is running.');
      }
      throw error;
    }
  };

  const processUserResponse = async (userInput: string) => {
    setRetryCount(0);
    const userMessage: ConversationMessage = { 
      speaker: 'user', 
      text: userInput, 
      timestamp: new Date() 
    };
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);

    try {
      const aiData = await generateAIResponse(userInput, newHistory);
      const aiMessage: ConversationMessage = { 
        speaker: 'ai', 
        text: aiData.response, 
        timestamp: new Date(), 
        isFallback: aiData.isFallback 
      };
      setConversationHistory(prev => [...prev, aiMessage]);
      await speakText(aiData.response);
    } catch (error: any) {
      console.error("Error processing user response:", error);
      
      const errorText = error.message.includes('Cannot connect to AI service') 
        ? "The AI service is not available. Please make sure the backend server is running on port 5000."
        : "I'm having trouble connecting. Let's try that again.";
      
      const errorMsg: ConversationMessage = { 
        speaker: 'ai', 
        text: errorText, 
        timestamp: new Date(), 
        isFallback: true 
      };
      setConversationHistory(prev => [...prev, errorMsg]);
      await speakText(errorMsg.text);
    } finally {
      if (isRecording && !errorMessage && recognitionRef.current) {
        try { 
          recognitionRef.current.start(); 
        } catch (e) { 
          console.log("Recognition could not be started."); 
        }
      }
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setAiStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        setAiStatus('idle');
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setAiStatus('idle');
        resolve();
      };
      
      speechSynthesis.speak(utterance);
    });
  };

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported by your browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const spokenText = event.results[last][0].transcript;
      processUserResponse(spokenText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error event:", event);
      setIsRecording(false);
      setAiStatus('idle');

      if (event.error === 'network') {
        if (retryCount < MAX_RETRIES) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          const delay = Math.pow(2, newRetryCount) * 1000;
          setErrorMessage(`Connection lost. Retrying in ${delay / 1000}s...`);
          retryTimeoutRef.current = setTimeout(() => {
            retryVoiceInterview(true);
          }, delay);
        } else {
          setErrorMessage("Connection to speech service failed.");
          setDebugInfo({
            error: event.error, 
            message: event.message || 'No additional message provided.',
            isOnline: navigator.onLine, 
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } else if (event.error === 'no-speech' && isRecording) {
        try { recognition.start(); } catch (e) { console.log("Could not restart recognition."); }
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMessage("Microphone access was denied.");
      } else {
        setErrorMessage("Speech recognition error: " + event.error);
      }
    };
    
    recognitionRef.current = recognition;
  };

  const retryVoiceInterview = (isAutoRetry = false) => {
    if (!isAutoRetry) {
      setRetryCount(0);
    }
    setErrorMessage('');
    setDebugInfo(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch(e) {
        console.error("Failed to retry speech recognition:", e);
        setErrorMessage("Could not restart interview. Please refresh.");
      }
    }
  };

  // Test connection on component mount
  useEffect(() => {
    testBackendConnection();
  }, []);

  useEffect(() => {
    if (step === 2) {
      initializeSpeechRecognition();
      
      // Start story session and store the ID
      startStorySession().then((greeting) => {
        speakText(greeting).then(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
          }
        });
      }).catch((error) => {
        console.error('Failed to start story session:', error);
        setErrorMessage('Failed to start interview session. Please try again.');
        setStep(1); // Go back to setup
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      speechSynthesis.cancel();
      setIsRecording(false);
    };
  }, [step]);

  const renderSetupStep = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Begin a New Story</h1>
        <p className="text-lg text-gray-600">Provide some basic details to get started with the interview.</p>
      </div>
      
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Connection Test */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700 flex items-center gap-2">
                <Wifi size={16} />
                Backend Connection
              </p>
              <p className={`text-sm ${isBackendConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isBackendConnected ? '✅ Connected' : '❌ Not connected'}
              </p>
            </div>
            <button
              onClick={testBackendConnection}
              disabled={isTestingConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm flex items-center gap-2"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          {!isBackendConnected && (
            <p className="text-xs text-red-600 mt-2">
              Make sure your backend server is running on port 5000. Run: <code className="bg-gray-800 text-white px-2 py-1 rounded">node server.js</code>
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="storytellerName" className="block text-sm font-semibold text-gray-700 mb-2">1. Storyteller's Name</label>
          <input 
            type="text" 
            id="storytellerName" 
            value={storytellerName} 
            onChange={(e) => setStorytellerName(e.target.value)} 
            placeholder="e.g., Jane Doe" 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" 
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">2. Select a Topic</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map(topic => (
              <button 
                key={topic.id} 
                onClick={() => setSelectedTopic(topic.id)} 
                className={`p-4 border rounded-lg text-center transition ${
                  selectedTopic === topic.id 
                    ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500' 
                    : 'bg-white border-gray-200 hover:border-amber-400'
                }`}
              >
                <span className="text-3xl">{topic.icon}</span>
                <p className="font-semibold mt-2 text-sm text-gray-800">{topic.title}</p>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && <p className="text-center text-red-600 mt-4 flex items-center justify-center gap-2"><AlertTriangle size={16} /> {errorMessage}</p>}

        <div className="mt-8">
          <button 
            onClick={handleStartInterview} 
            disabled={!storytellerName || !selectedTopic || !isBackendConnected}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start Interview <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderVoiceInterview = () => (
    <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 flex flex-col justify-start items-center pt-8 gap-4">
        <AiCharacter status={aiStatus} />
        
        {/* Save Button */}
        <button
          onClick={endStorySession}
          disabled={isSaving || conversationHistory.length < 2}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Story
            </>
          )}
        </button>
        
        {currentStoryId && (
          <p className="text-xs text-gray-500 text-center">
            Story ID: {currentStoryId.substring(0, 8)}...
          </p>
        )}
      </div>
      
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Conversation with {storytellerName}</h2>
        <div className="flex-grow h-96 overflow-y-auto pr-4 space-y-4">
          {conversationHistory.map((message, index) => (
            <div key={index} className={`flex items-end gap-2 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.speaker === 'ai' && <img src="https://i.pravatar.cc/150?u=anna-ai" className="w-8 h-8 rounded-full" alt="AI" />}
              <div className={`inline-block px-4 py-3 rounded-lg max-w-md ${
                message.speaker === 'ai' 
                  ? 'bg-blue-100 text-gray-800 rounded-bl-none' 
                  : 'bg-amber-100 text-gray-800 rounded-br-none'
              }`}>
                <p className="text-sm">{message.text}</p>
                {message.isFallback && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Fallback response</p>
                )}
              </div>
              {message.speaker === 'user' && <User className="w-8 h-8 rounded-full p-1 bg-gray-200 text-gray-600" />}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {isRecording ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Listening...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <Mic className="w-5 h-5" />
                  <span>{errorMessage ? 'Interrupted' : 'Paused'}</span>
                </div>
              )}
            </div>
            {errorMessage && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle size={16} /> {errorMessage}
                </p>
                {retryCount >= MAX_RETRIES && (
                  <button 
                    onClick={() => retryVoiceInterview(false)} 
                    className="px-3 py-1 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
          {debugInfo && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <p className="font-bold mb-1">Diagnostics:</p>
              <ul className="list-disc list-inside">
                <li><strong>Error Code:</strong> {debugInfo.error}</li>
                <li><strong>Browser Status:</strong> {debugInfo.isOnline ? 'Online' : 'Offline'}</li>
                <li><strong>Timestamp:</strong> {debugInfo.timestamp}</li>
                <li className="break-words"><strong>Details:</strong> {debugInfo.message}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-amber-600" />
            <span className="text-2xl font-semibold text-gray-800">Memory Keeper Pro</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${isBackendConnected ? 'text-green-600' : 'text-red-600'}`}>
            <Wifi size={16} />
            {isBackendConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </nav>
      <main>
        {step === 1 && renderSetupStep()}
        {step === 2 && renderVoiceInterview()}
      </main>
    </div>
  );
}