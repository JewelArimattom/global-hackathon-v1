import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Mic, User, Heart, Clock, CheckCircle2, ArrowRight, Play, Pause, RotateCcw, Save, Phone, MessageCircle, WifiOff } from 'lucide-react';

// Types
interface ConversationMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp?: Date;
  isFallback?: boolean;
}

interface Story {
  _id?: string;
  storytellerName: string;
  topic: string;
  recordingDuration: number;
  transcript: string;
  audioUrl?: string;
  createdAt?: Date;
  status: 'processing' | 'completed' | 'failed';
  conversationHistory: ConversationMessage[];
}

interface AIResponse {
  response: string;
  timestamp: string;
  suggestedFollowUp?: string;
  isFallback?: boolean;
}

// --- NEW --- AI Character Component
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
        // Replace this with a real image of your AI character "Anna"
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
  const [recordingTime, setRecordingTime] = useState(0);
  const [storytellerName, setStorytellerName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(true);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [interviewMode, setInterviewMode] = useState<'voice' | 'phone'>('voice');
  
  // --- NEW STATES FOR VAPI PHONE CALL ---
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'active' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const topics = [
    { id: 'childhood', title: 'Childhood Memories', icon: '🎈', description: 'Early years and growing up' },
    { id: 'family', title: 'Family Stories', icon: '👨‍👩‍👧‍👦', description: 'Family traditions and relationships' },
    { id: 'career', title: 'Work & Career', icon: '💼', description: 'Professional journey and achievements' },
    { id: 'love', title: 'Love & Marriage', icon: '💕', description: 'Romantic memories and relationships' },
    { id: 'wisdom', title: 'Life Lessons', icon: '💡', description: 'Wisdom and advice for future generations' },
    { id: 'travel', title: 'Adventures & Travel', icon: '✈️', description: 'Travels and memorable experiences' },
  ];

  // --- NEW --- Master function to start either voice or phone interview
  const handleStartInterview = async () => {
    setErrorMessage('');
    if (!storytellerName || !selectedTopic) {
      setErrorMessage('Please provide the storyteller\'s name and select a topic.');
      return;
    }

    if (interviewMode === 'phone') {
      if (!phoneNumber) {
        setErrorMessage('Please enter a valid phone number for the interview.');
        return;
      }
      await startPhoneInterview();
    } else {
      setStep(2);
      await startRecording();
    }
  };

  // --- NEW --- Function to initiate a VAPI phone call
  const startPhoneInterview = async () => {
    setCallStatus('calling');
    setStep(2);
    try {
      const response = await fetch('http://localhost:5000/api/vapi/start-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storytellerName,
          topic: selectedTopic,
          phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate the call.');
      }
      
      const data = await response.json();
      console.log('Call initiated:', data);
      setCallStatus('active');

    } catch (error: any) {
      console.error('Phone interview error:', error);
      setErrorMessage(error.message);
      setCallStatus('error');
    }
  };


  const generateAIResponse = async (userInput: string, history: ConversationMessage[]): Promise<AIResponse> => {
    // ... (existing function remains the same)
  };

  const processUserResponse = async (userInput: string) => {
    // ... (existing function remains the same)
  };

  const shouldEndConversation = (text: string): boolean => {
    // ... (existing function remains the same)
  };

  const endConversationGracefully = async () => {
    // ... (existing function remains the same)
  };

  const speakText = (text: string): Promise<void> => {
    // ... (existing function remains the same)
  };
  
  const startRecording = async () => {
    // ... (existing function remains the same)
  };
  
  const initializeSpeechRecognition = () => {
    // ... (existing function remains the same)
  };


  // --- UI Components for each step/mode ---

  const renderSetupStep = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Begin a New Story</h1>
        <p className="text-lg text-gray-600">Choose the interview method and provide some basic details to get started.</p>
      </div>

      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">1. Choose Interview Method</label>
          <div className="flex justify-center gap-4 bg-gray-100 p-2 rounded-lg">
            <button
              onClick={() => setInterviewMode('voice')}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition ${
                interviewMode === 'voice' ? 'bg-amber-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-5 h-5" /> Voice Interview
            </button>
            <button
              onClick={() => setInterviewMode('phone')}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition ${
                interviewMode === 'phone' ? 'bg-amber-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Phone className="w-5 h-5" /> Phone Interview
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="storytellerName" className="block text-sm font-semibold text-gray-700 mb-2">2. Storyteller's Name</label>
            <input
              type="text"
              id="storytellerName"
              value={storytellerName}
              onChange={(e) => setStorytellerName(e.target.value)}
              placeholder="e.g., Jane Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {interviewMode === 'phone' && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">3. Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{interviewMode === 'phone' ? '4.' : '3.'} Select a Topic</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`p-4 border rounded-lg text-center transition ${
                  selectedTopic === topic.id ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500' : 'bg-white border-gray-200 hover:border-amber-400'
                }`}
              >
                <span className="text-3xl">{topic.icon}</span>
                <p className="font-semibold mt-2 text-sm text-gray-800">{topic.title}</p>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && <p className="text-center text-red-600 mt-4">{errorMessage}</p>}
        
        <div className="mt-8">
          <button
            onClick={handleStartInterview}
            disabled={!storytellerName || !selectedTopic || (interviewMode === 'phone' && !phoneNumber)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition disabled:bg-gray-400"
          >
            Start Interview <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderVoiceInterview = () => (
    <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 flex justify-center items-start pt-8">
        <AiCharacter status={aiStatus} />
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Conversation with {storytellerName}</h2>
        <div className="h-96 overflow-y-auto pr-4 space-y-4">
          {conversationHistory.map((message, index) => (
             <div key={index} className={`flex items-end gap-2 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.speaker === 'ai' && <img src="https://i.pravatar.cc/150?u=anna-ai" className="w-8 h-8 rounded-full" />}
                <div
                    className={`inline-block px-4 py-3 rounded-lg max-w-md ${
                        message.speaker === 'ai'
                        ? 'bg-blue-100 text-gray-800 rounded-bl-none'
                        : 'bg-amber-100 text-gray-800 rounded-br-none'
                    }`}
                >
                    <p className="text-sm">{message.text}</p>
                </div>
                {message.speaker === 'user' && <User className="w-8 h-8 rounded-full p-1 bg-gray-200 text-gray-600" />}
            </div>
          ))}
        </div>
        {/* You can add control buttons here if needed */}
      </div>
    </div>
  );

  const renderPhoneInterview = () => (
    <div className="container mx-auto px-6 py-12 text-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        {callStatus === 'calling' && (
          <>
            <Phone className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
            <h2 className="text-2xl font-bold mt-4">Calling...</h2>
            <p className="text-gray-600 mt-2">We are connecting with {storytellerName} at {phoneNumber}.</p>
          </>
        )}
        {callStatus === 'active' && (
          <>
            <div className="relative w-16 h-16 mx-auto">
              <Mic className="w-16 h-16 text-green-500" />
              <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping"></div>
            </div>
            <h2 className="text-2xl font-bold mt-4">Interview in Progress</h2>
            <p className="text-gray-600 mt-2">{storytellerName} is now sharing their stories. The conversation is being recorded.</p>
          </>
        )}
        {callStatus === 'completed' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold mt-4">Call Completed</h2>
            <p className="text-gray-600 mt-2">The interview with {storytellerName} has finished. The story is being saved.</p>
          </>
        )}
        {callStatus === 'error' && (
          <>
            <WifiOff className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold mt-4">Connection Failed</h2>
            <p className="text-gray-600 mt-2">{errorMessage}</p>
            <button onClick={() => { setStep(1); setCallStatus('idle'); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Try Again</button>
          </>
        )}
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
        </div>
      </nav>

      <main>
        {step === 1 && renderSetupStep()}
        {step === 2 && interviewMode === 'voice' && renderVoiceInterview()}
        {step === 2 && interviewMode === 'phone' && renderPhoneInterview()}
      </main>
    </div>
  );
}