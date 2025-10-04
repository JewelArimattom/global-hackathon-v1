import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, ArrowRight, AlertTriangle, Wifi, Save, Loader2, MessageSquare, Play } from 'lucide-react';

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

// --- Main Component ---
export default function RecordingStoriesPage() {
  const [interviewState, setInterviewState] = useState<'ready' | 'running' | 'saving' | 'error'>('ready');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hardcoded values to replace setup fields
  const storytellerName = 'Friend';
  const selectedTopic = 'wisdom'; // Using 'wisdom' as a general-purpose, open-ended topic.

  // Scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Test backend connection on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => setIsBackendConnected(res.ok))
      .catch(() => setIsBackendConnected(false));

    return () => { // Cleanup function
      if (recognitionRef.current) recognitionRef.current.abort();
      speechSynthesis.cancel();
    };
  }, []);

  // --- API and Speech Functions ---

  const startStorySession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storytellerName, topic: selectedTopic, interviewMode: 'voice' }),
      });
      if (!response.ok) throw new Error('Failed to start story session');
      const data = await response.json();
      setCurrentStoryId(data.storyId);
      setRecordingStartTime(Date.now());
      const greeting: ConversationMessage = { speaker: 'ai', text: data.greeting, timestamp: new Date() };
      setConversationHistory([greeting]);
      return data.greeting;
    } catch (error) {
      console.error('Error starting story session:', error);
      throw error;
    }
  };

  const endStorySession = async () => {
    if (!currentStoryId || !recordingStartTime) return;
    setIsSaving(true);
    try {
      const recordingDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
      const response = await fetch('http://localhost:5000/api/ai/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: currentStoryId, recordingDuration }),
      });
      if (!response.ok) throw new Error('Failed to save story session');
      alert('Story saved successfully!');
      // Reset to start
      setInterviewState('ready');
      setConversationHistory([]);
      setCurrentStoryId(null);
    } catch (error) {
      setErrorMessage('Failed to save story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBeginInterview = async () => {
    setErrorMessage('');
    setInterviewState('running');
    initializeSpeechRecognition();

    try {
      const greeting = await startStorySession();
      await speakText(greeting);
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    } catch (error) {
      setErrorMessage('Failed to start interview session. Please try again.');
      setInterviewState('ready');
    }
  };

  const generateAIResponse = async (userInput: string, history: ConversationMessage[]): Promise<AIResponse> => {
    setAiStatus('thinking');
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
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    return await response.json();
  };

  const processUserResponse = async (userInput: string) => {
    const userMessage: ConversationMessage = { speaker: 'user', text: userInput, timestamp: new Date() };
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);
    try {
      const aiData = await generateAIResponse(userInput, newHistory);
      const aiMessage: ConversationMessage = { speaker: 'ai', text: aiData.response, timestamp: new Date(), isFallback: aiData.isFallback };
      setConversationHistory(prev => [...prev, aiMessage]);
      await speakText(aiData.response);
    } catch (error) {
      const errorMsg: ConversationMessage = { speaker: 'ai', text: "I'm having trouble connecting. Let's try that again in a moment.", timestamp: new Date(), isFallback: true };
      setConversationHistory(prev => [...prev, errorMsg]);
      await speakText(errorMsg.text);
    } finally {
      if (isRecording && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) { console.warn("Recognition could not be restarted."); }
      }
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setAiStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => { setAiStatus('idle'); resolve(); };
      utterance.onerror = () => { setAiStatus('idle'); resolve(); };
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
    recognition.onresult = (event) => processUserResponse(event.results[event.results.length - 1][0].transcript);
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setAiStatus('idle');
      if (event.error === 'no-speech' && isRecording) {
        try { recognition.start(); } catch (e) {}
      } else if (event.error === 'not-allowed') {
        setErrorMessage("Microphone access was denied.");
      } else {
        setErrorMessage("Speech recognition error: " + event.error);
      }
    };
    recognitionRef.current = recognition;
  };
  
  // --- Render Functions ---

  const renderMessageBubble = (message: ConversationMessage, index: number) => {
    const isUser = message.speaker === 'user';
    return (
      <div key={index} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && <img src="https://i.pravatar.cc/150?u=anna-ai" className="w-8 h-8 rounded-full self-start" alt="AI" />}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`inline-block px-4 py-3 rounded-2xl max-w-md md:max-w-lg ${
            isUser 
              ? 'bg-teal-600 text-white rounded-br-none' 
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
          }`}>
            <p className="text-sm">{message.text}</p>
          </div>
          {message.isFallback && <p className="text-xs text-red-500 mt-1">⚠️ Fallback response</p>}
        </div>
        {isUser && <User className="w-8 h-8 rounded-full p-1.5 bg-slate-200 text-slate-600 self-start" />}
      </div>
    );
  };

  const getStatusText = () => {
    if (aiStatus === 'speaking') return 'Anna is speaking...';
    if (aiStatus === 'thinking') return 'Anna is thinking...';
    if (isRecording) return 'Listening...';
    if (errorMessage) return 'Interview interrupted';
    return 'Paused';
  };

  const renderFooter = () => {
    if (interviewState === 'ready') {
      return (
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col items-center justify-center">
            <button 
              onClick={handleBeginInterview}
              disabled={!isBackendConnected}
              className="px-8 py-4 bg-teal-600 text-white font-bold rounded-full hover:bg-teal-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
            >
              <Play className="w-6 h-6" /> Start Conversation
            </button>
             {!isBackendConnected && <p className="text-red-600 text-sm mt-3">Cannot connect to server. Please try again later.</p>}
        </div>
      );
    }

    return (
       <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
              <div className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${isRecording ? 'bg-teal-100' : 'bg-slate-200'}`}>
                {isRecording && <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-50"></div>}
                <Mic className={`w-8 h-8 z-10 ${isRecording ? 'text-teal-600' : 'text-slate-500'}`} />
              </div>
              <p className="text-sm font-medium text-slate-600 h-5">{getStatusText()}</p>
          </div>
          <button
            onClick={endStorySession}
            disabled={isSaving || conversationHistory.length < 2}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition disabled:bg-slate-400"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            End & Save
          </button>
        </div>
         {errorMessage && <p className="text-center text-red-600 text-sm mt-3 flex items-center justify-center gap-2"><AlertTriangle size={16} /> {errorMessage}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" />
            <span className="text-xl font-semibold text-slate-800">AI Interviewer</span>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${isBackendConnected ? 'text-green-600' : 'text-red-600'}`}>
            <Wifi size={16} />
            {isBackendConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </nav>

      <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {conversationHistory.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-700">Ready to Listen</h2>
              <p className="mt-2 text-slate-500">
                Click "Start Conversation" below to begin sharing your story.
              </p>
            </div>
          )}
          {conversationHistory.map(renderMessageBubble)}
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <footer className="flex-shrink-0">
        {renderFooter()}
      </footer>
    </div>
  );
}